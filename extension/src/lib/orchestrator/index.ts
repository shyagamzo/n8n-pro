import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import { createOpenAiChatModel } from '../ai/model'
import { createAgentTracer } from '../ai/tracing'
import { buildPrompt } from '../prompts'
import { parse as parseLoom } from '../loom'
import { streamChatCompletion } from '../services/openai'
import { stripCodeFences } from '../utils/markdown'
import { debugLLMResponse, debugLoomParsing, debugPlanGenerated, DebugSession, debugAgentDecision, debugAgentHandoff } from '../utils/debug'
import { validateWorkflow, formatValidationResult } from '../validation/workflow'

export type OrchestratorInput = {
  apiKey: string
  messages: ChatMessage[]
}

export type StreamTokenHandler = (token: string) => void

class Orchestrator
{
  public async handle(input: OrchestratorInput, onToken?: StreamTokenHandler): Promise<string>
  {
    // Create agent tracer for this conversation
    const tracer = createAgentTracer()
    tracer.setAgent('orchestrator')
    tracer.logDecision(
      'Starting chat handler',
      'Using general assistant for now. TODO: Replace with LangGraph classifier → enrichment → planner → executor',
      { messageCount: input.messages.length }
    )

    // TODO: Replace with LangGraph graph: classifier → enrichment → planner → executor
    // For now, use a general assistant prompt with n8n knowledge
    const systemPrompt = buildPrompt('planner', {
      includeNodesReference: true,
      includeConstraints: true,
    })

    // Prepend system message to conversation
    const messagesWithSystem: ChatMessage[] = [
      { id: 'system', role: 'system', text: systemPrompt },
      ...input.messages,
    ]

    // Log decision to use planner directly (bypassing classifier/enrichment for now)
    debugAgentDecision(
      'orchestrator',
      'Using planner agent directly',
      'Classifier and enrichment not yet implemented in MVP',
      { promptLength: systemPrompt.length }
    )
    debugAgentHandoff('orchestrator', 'planner', 'Direct handoff for chat completion')

    // Stream the response token by token to the UI
    if (onToken)
    {
      await streamChatCompletion(
        input.apiKey,
        messagesWithSystem,
        onToken
      )
      tracer.completeTrace()
    }
    else
    {
      // Fallback to blocking call if no streaming callback provided
      const model = createOpenAiChatModel({ apiKey: input.apiKey, tracer })
      const result = await model.generateText(messagesWithSystem)
      tracer.completeTrace()
      return result
    }

    return ''
  }

  /**
   * Check if the conversation has enough information to generate a workflow plan.
   * This prevents generating useless plans when the assistant is still gathering requirements.
   */
  public async isReadyToPlan(input: OrchestratorInput): Promise<{ ready: boolean; reason?: string }>
  {
    // Create agent tracer for readiness check
    const tracer = createAgentTracer()
    tracer.setAgent('orchestrator')
    tracer.logDecision('Checking if ready to plan', 'Assessing conversation completeness')

    // Handoff to enrichment agent (simulated for now)
    debugAgentHandoff('orchestrator', 'enrichment', 'Checking if more information is needed')
    tracer.logHandoff('enrichment', 'Assessing readiness to generate workflow plan')
    tracer.setAgent('enrichment')

    // Build enrichment prompt to assess readiness
    const systemPrompt = buildPrompt('planner', {
      includeNodesReference: false,
      includeConstraints: true,
    })

    const readinessCheck: ChatMessage = {
      id: 'readiness-check',
      role: 'user',
      text: 'Based on our conversation, do we have enough information to create a complete workflow? ' +
            'Answer with just "READY" if we have all necessary details (trigger type, actions, services, etc.), ' +
            'or "NOT_READY: [what\'s missing]" if we need more information.',
    }

    const messagesWithSystem: ChatMessage[] = [
      { id: 'system', role: 'system', text: systemPrompt },
      ...input.messages,
      readinessCheck,
    ]

    const model = createOpenAiChatModel({ apiKey: input.apiKey, tracer })
    const response = await model.generateText(messagesWithSystem)

    const isReady = response.trim().toUpperCase().startsWith('READY')

    // Log enrichment decision
    debugAgentDecision(
      'enrichment',
      isReady ? 'Ready to plan' : 'Need more information',
      response,
      { messageCount: input.messages.length }
    )

    tracer.completeTrace()

    return {
      ready: isReady,
      reason: isReady ? undefined : response.replace(/^NOT_READY:\s*/i, '').trim()
    }
  }

  public async plan(input: OrchestratorInput): Promise<Plan>
  {
    const session = new DebugSession('Orchestrator', 'plan')
    session.log('Starting plan generation', { messageCount: input.messages.length })

    // Create agent tracer for plan generation
    const tracer = createAgentTracer(session.getSessionId())
    tracer.setAgent('orchestrator')
    tracer.logDecision('Starting plan generation', 'User requested workflow plan')

    // Handoff to planner agent
    debugAgentHandoff('orchestrator', 'planner', 'Generate workflow plan from conversation')
    tracer.logHandoff('planner', 'Generate structured workflow from user requirements')
    tracer.setAgent('planner')

    // Build planner prompt
    const systemPrompt = buildPrompt('planner', {
      includeNodesReference: true,
      includeWorkflowPatterns: true,
      includeConstraints: true,
    })
    session.log('Built planner prompt', { promptLength: systemPrompt.length })

    // Create request asking for workflow plan
    const planRequest: ChatMessage = {
      id: 'plan-request',
      role: 'user',
      text: 'Generate a workflow plan based on our conversation. Return ONLY raw Loom format - no markdown code blocks, no explanatory text, just the pure Loom structure.',
    }

    // Prepend system message and append plan request
    const messagesWithSystem: ChatMessage[] = [
      { id: 'system', role: 'system', text: systemPrompt },
      ...input.messages,
      planRequest,
    ]

    // Call LLM to generate plan
    const model = createOpenAiChatModel({ apiKey: input.apiKey, tracer })
    session.log('Calling LLM for plan generation')

    debugAgentDecision(
      'planner',
      'Generating workflow plan',
      'Using LLM to convert conversation to Loom format',
      { messageCount: messagesWithSystem.length }
    )

    const loomResponse = await model.generateText(messagesWithSystem)

    // Log LLM response
    debugLLMResponse(loomResponse, systemPrompt)
    session.log('LLM response received', { responseLength: loomResponse.length })

    // Parse Loom response into Plan object
    try
    {
      // Strip markdown code fences if present (LLM sometimes wraps response in ```)
      const cleanedResponse = stripCodeFences(loomResponse)
      session.log('Stripped code fences', { cleanedLength: cleanedResponse.length })

      session.log('Parsing Loom response')
      const parsed = parseLoom(cleanedResponse)

      if (!parsed.success || !parsed.data)
      {
        const errorMsg = 'Failed to parse Loom response: ' + parsed.errors.map(e => e.message).join(', ')
        debugLoomParsing(cleanedResponse, parsed, false)
        session.log('Loom parsing failed', { errors: parsed.errors })
        throw new Error(errorMsg)
      }

      debugLoomParsing(cleanedResponse, parsed.data, true)
      session.log('Loom parsing succeeded')

      // Convert parsed Loom to Plan type
      const plan = this.loomToPlan(parsed.data)

      // Log planner decision
      debugAgentDecision(
        'planner',
        'Plan generated successfully',
        'Converted Loom to workflow plan',
        {
          nodeCount: plan.workflow.nodes?.length || 0,
          credentialsNeeded: plan.credentialsNeeded?.length || 0
        }
      )

      // Validate workflow structure
      session.log('Validating workflow structure')
      const validation = validateWorkflow(plan.workflow)
      debugPlanGenerated({
        plan,
        validation,
        sessionId: session.getSessionId()
      })

      if (!validation.valid)
      {
        session.log('Workflow validation failed', {
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length
        })
        console.warn('⚠️ Workflow validation issues detected:', formatValidationResult(validation))

        debugAgentDecision(
          'planner',
          'Validation failed',
          'Workflow has structural issues',
          { errors: validation.errors.length, warnings: validation.warnings.length }
        )
      }
      else if (validation.warnings.length > 0)
      {
        session.log('Workflow has warnings', { warningCount: validation.warnings.length })
        console.warn('⚠️ Workflow validation warnings:', formatValidationResult(validation))
      }
      else
      {
        session.log('Workflow validation passed')
      }

      // Handoff back to orchestrator
      debugAgentHandoff('planner', 'orchestrator', 'Plan ready for user review')
      tracer.logHandoff('orchestrator', 'Return plan to user')
      tracer.setAgent('orchestrator')

      session.end(true)
      tracer.completeTrace()
      return plan
    }
    catch (error)
    {
      console.error('❌ Plan parsing error:', error)
      console.error('📄 Raw LLM response:', loomResponse)
      session.log('Error occurred', { error })

      debugAgentDecision(
        'planner',
        'Plan generation failed',
        error instanceof Error ? error.message : 'Unknown error',
        { responseLength: loomResponse.length }
      )

      session.end(false)
      tracer.completeTrace()

      // Don't create a useless fallback workflow - throw error instead
      throw new Error(
        'Failed to generate a valid workflow plan. ' +
        'The AI response could not be parsed. ' +
        'Please try rephrasing your request or providing more details. ' +
        'Check console for full error details.'
      )
    }
  }

  private loomToPlan(loomData: Record<string, unknown>): Plan
  {
    // Extract fields from Loom data
    const title = String(loomData.title || 'Workflow')
    const summary = String(loomData.summary || 'Generated workflow')
    // Handle case where credentialsNeeded might be parsed as string '[]' instead of array
    const credentialsNeededRaw = loomData.credentialsNeeded
    const credentialsNeeded = Array.isArray(credentialsNeededRaw)
      ? credentialsNeededRaw
      : []

    const credentialsNeededArray = credentialsNeeded.map(cred =>
    {
      const c = cred as Record<string, unknown>
      return {
        type: String(c.type || ''),
        name: c.name ? String(c.name) : undefined,
        requiredFor: c.requiredFor ? String(c.requiredFor) : undefined,
        nodeId: c.nodeId ? String(c.nodeId) : undefined,
        nodeName: c.nodeName ? String(c.nodeName) : undefined,
      }
    })

    // Handle case where credentialsAvailable might be parsed as string '[]' instead of array
    const credentialsAvailableRaw = loomData.credentialsAvailable
    const credentialsAvailable = Array.isArray(credentialsAvailableRaw)
      ? credentialsAvailableRaw
      : []

    const credentialsAvailableArray = credentialsAvailable.map(cred =>
    {
      const c = cred as Record<string, unknown>
      return {
        type: String(c.type || ''),
        name: c.name ? String(c.name) : undefined,
        requiredFor: c.status ? String(c.status) : undefined,
      }
    })

    const workflow = loomData.workflow as Record<string, unknown> || {}

    return {
      title,
      summary,
      credentialsNeeded: credentialsNeededArray,
      credentialsAvailable: credentialsAvailableArray.length > 0 ? credentialsAvailableArray : undefined,
      workflow: {
        name: String(workflow.name || title),
        nodes: (workflow.nodes as unknown[]) || [],
        connections: (workflow.connections as Record<string, unknown>) || {},
      },
    }
  }

}

export const orchestrator = new Orchestrator()


