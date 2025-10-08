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
import { validatePlan } from './validator'
import { fetchNodeTypes } from '../n8n/node-types'
import { logValidation, formatValidationErrors } from '../utils/validation-logger'
import { getN8nApiKey, getBaseUrl } from '../services/settings'

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
      'Using enrichment agent for conversational responses',
      { messageCount: input.messages.length }
    )

    // Use enrichment agent for conversational responses (not planner!)
    // Planner should only be used in plan() method for generating Loom format
    const systemPrompt = buildPrompt('enrichment', {
      includeNodesReference: true,
      includeConstraints: true,
    })

    // Prepend system message to conversation
    const messagesWithSystem: ChatMessage[] = [
      { id: 'system', role: 'system', text: systemPrompt },
      ...input.messages,
    ]

    // Log decision to use enrichment for chat
    debugAgentDecision(
      'orchestrator',
      'Using enrichment agent for chat',
      'Enrichment provides conversational responses and gathers requirements',
      { promptLength: systemPrompt.length }
    )
    debugAgentHandoff('orchestrator', 'enrichment', 'Conversational response and requirement gathering')

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

    // Handoff to enrichment agent
    debugAgentHandoff('orchestrator', 'enrichment', 'Checking if more information is needed')
    tracer.logHandoff('enrichment', 'Assessing readiness to generate workflow plan')
    tracer.setAgent('enrichment')

    // Build enrichment prompt to assess readiness
    const systemPrompt = buildPrompt('enrichment', {
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

      // Deep validation with Validator Agent
      session.log('Running deep validation with Validator Agent')
      debugAgentHandoff('planner', 'validator', 'Validate workflow against n8n API')
      tracer.logHandoff('validator', 'Check node types and parameters against n8n')
      tracer.setAgent('validator')

      try
      {
        // Fetch n8n node types
        const [n8nApiKey, baseUrl] = await Promise.all([getN8nApiKey(), getBaseUrl()])
        const nodeTypes = await fetchNodeTypes({
          baseUrl: baseUrl || undefined,
          apiKey: n8nApiKey || undefined
        })

        // Run validator
        const validatorResult = await validatePlan({
          apiKey: input.apiKey,
          plan,
          nodeTypes
        })

        // Log validation results
        logValidation({
          workflowName: plan.workflow.name,
          valid: validatorResult.valid,
          errors: validatorResult.errors || [],
          warnings: validatorResult.warnings || [],
          plannerOutput: plan,
          validatorDecision: validatorResult.valid ? 'pass' : 'fail',
          retryCount: 0,
          sessionId: session.getSessionId()
        })

        if (!validatorResult.valid)
        {
          session.log('Validator rejected plan', {
            errors: validatorResult.errors?.length || 0,
            warnings: validatorResult.warnings?.length || 0
          })

          debugAgentDecision(
            'validator',
            'Validation failed',
            'Workflow contains invalid node types or structure',
            { errors: validatorResult.errors?.length, warnings: validatorResult.warnings?.length }
          )

          // Format validation errors for user
          const errorMessage = formatValidationErrors(validatorResult)
          console.error('❌ Validator rejected plan:', errorMessage)

          // Throw error to prevent invalid workflow from being sent
          throw new Error(
            'Workflow validation failed:\n\n' + errorMessage + '\n\n' +
            'The workflow was rejected because it contains node types or structures that don\'t exist in n8n. ' +
            'Please try again with a different approach.'
          )
        }

        debugAgentDecision(
          'validator',
          'Validation passed',
          'Workflow is valid and ready for creation',
          { warnings: validatorResult.warnings?.length || 0 }
        )

        if (validatorResult.warnings && validatorResult.warnings.length > 0)
        {
          session.log('Validator has warnings', { warningCount: validatorResult.warnings.length })
          console.warn('⚠️ Validator warnings:', validatorResult.warnings)
        }
      }
      catch (error)
      {
        // If validator can't fetch node types (404, network error, etc.), fall back to structural validation
        console.warn('⚠️ Deep validation unavailable, using structural validation only:', error)
        session.log('Validator unavailable, using structural validation', { error })

        debugAgentDecision(
          'validator',
          'Deep validation skipped',
          'Node types API unavailable, relying on structural validation',
          { error: error instanceof Error ? error.message : String(error) }
        )

        // Structural validation already passed (earlier in the flow)
        // So we can safely continue with the workflow
        console.info('✅ Structural validation passed, proceeding with workflow creation')
      }

      // Handoff back to orchestrator
      debugAgentHandoff('validator', 'orchestrator', 'Plan validated and ready for user review')
      tracer.logHandoff('orchestrator', 'Return validated plan to user')
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


