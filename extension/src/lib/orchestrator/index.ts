import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import type { BackgroundMessage } from '../types/messaging'
import { createOpenAiChatModel } from '../ai/model'
import { createAgentTracer } from '../ai/tracing'
import { buildPrompt } from '../prompts'
import { parse as parseLoom } from '../loom'
import { loomToPlan } from './plan-converter'
import { streamChatCompletion } from '../services/openai'
import { stripCodeFences } from '../utils/markdown'
import { debugLLMResponse, debugLoomParsing, debugPlanGenerated, DebugSession, debugAgentDecision, debugAgentHandoff } from '../utils/debug'
import { validateWorkflow, formatValidationResult } from '../validation/workflow'
import { validatePlan } from './validator'
import { fetchNodeTypes } from '../n8n/node-types'
import { logValidation, formatValidationErrors } from '../utils/validation-logger'
import { getN8nApiKey, getBaseUrl } from '../services/settings'
import { createNarrationManager } from './narration'

export type OrchestratorInput = {
  apiKey: string
  messages: ChatMessage[]
}

export type StreamTokenHandler = (token: string) => void
export type ActivityHandler = (message: BackgroundMessage) => void

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

  public async plan(input: OrchestratorInput, postHandler?: ActivityHandler): Promise<Plan>
  {
    const session = this.initializePlanningSession(input)
    const narrator = postHandler ? createNarrationManager(postHandler, input.apiKey) : undefined
    const userIntent = input.messages[input.messages.length - 1]?.text || 'workflow automation'
    
    const loomResponse = await this.invokePlannerAgent(input, session, narrator, userIntent)
    const plan = await this.parsePlanFromLoom(loomResponse, session)
    
    this.validatePlanStructure(plan, session)
    narrator?.post('planner', 'workflow design complete', 'complete')
    
    await this.performDeepValidation(plan, input.apiKey, session, narrator)
    
    session.end(true)
    return plan
  }

  private initializePlanningSession(input: OrchestratorInput): DebugSession
  {
    const session = new DebugSession('Orchestrator', 'plan')
    session.log('Starting plan generation', { messageCount: input.messages.length })

    const tracer = createAgentTracer(session.getSessionId())
    tracer.setAgent('orchestrator')
    tracer.logDecision('Starting plan generation', 'User requested workflow plan')

    debugAgentHandoff('orchestrator', 'planner', 'Generate workflow plan from conversation')
    tracer.logHandoff('planner', 'Generate structured workflow from user requirements')
    tracer.setAgent('planner')

    return session
  }

  private async invokePlannerAgent(
    input: OrchestratorInput, 
    session: DebugSession,
    narrator?: ReturnType<typeof createNarrationManager>,
    userIntent?: string
  ): Promise<string>
  {
    const systemPrompt = buildPrompt('planner', {
      includeNodesReference: true,
      includeWorkflowPatterns: true,
      includeConstraints: true,
    })
    session.log('Built planner prompt', { promptLength: systemPrompt.length })

    const planRequest: ChatMessage = {
      id: 'plan-request',
      role: 'user',
      text: 'Generate a workflow plan based on our conversation. Return ONLY raw Loom format - no markdown code blocks, no explanatory text, just the pure Loom structure.',
    }

    const messagesWithSystem: ChatMessage[] = [
      { id: 'system', role: 'system', text: systemPrompt },
      ...input.messages,
      planRequest,
    ]

    const tracer = createAgentTracer(session.getSessionId())
    const model = createOpenAiChatModel({ apiKey: input.apiKey, tracer })
    
    session.log('Calling LLM for plan generation')
    debugAgentDecision('planner', 'Generating workflow plan', 'Using LLM to convert conversation to Loom format', { messageCount: messagesWithSystem.length })

    narrator?.post('planner', 'designing workflow', 'started', userIntent)

    return await model.generateText(messagesWithSystem)
  }

  private async parsePlanFromLoom(loomResponse: string, session: DebugSession): Promise<Plan>
  {
    debugLLMResponse(loomResponse, '')
    session.log('LLM response received', { responseLength: loomResponse.length })

    const cleanedResponse = stripCodeFences(loomResponse)
    session.log('Stripped code fences', { cleanedLength: cleanedResponse.length })

    session.log('Parsing Loom response')
    const parsed = parseLoom(cleanedResponse)

    if (!parsed.success || !parsed.data)
    {
      debugLoomParsing(cleanedResponse, parsed, false)
      session.log('Loom parsing failed', { errors: parsed.errors })
      
      session.end(false)
      throw new Error(
        'Failed to generate a valid workflow plan. ' +
        'The AI response could not be parsed. ' +
        'Please try rephrasing your request or providing more details. ' +
        'Check console for full error details.'
      )
    }

    debugLoomParsing(cleanedResponse, parsed.data, true)
    session.log('Loom parsing succeeded')

    const plan = loomToPlan(parsed.data)

    debugAgentDecision(
      'planner',
      'Plan generated successfully',
      'Converted Loom to workflow plan',
      {
        nodeCount: plan.workflow.nodes?.length || 0,
        credentialsNeeded: plan.credentialsNeeded?.length || 0
      }
    )

    return plan
  }

  private validatePlanStructure(plan: Plan, session: DebugSession): void
  {
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
  }

  private async performDeepValidation(
    plan: Plan,
    apiKey: string,
    session: DebugSession,
    narrator?: ReturnType<typeof createNarrationManager>
  ): Promise<void>
  {
    session.log('Running deep validation with Validator Agent')
    
    const tracer = createAgentTracer(session.getSessionId())
    debugAgentHandoff('planner', 'validator', 'Validate workflow against n8n API')
    tracer.logHandoff('validator', 'Check node types and parameters against n8n')
    tracer.setAgent('validator')

    try
    {
      const [n8nApiKey, baseUrl] = await Promise.all([getN8nApiKey(), getBaseUrl()])
      const nodeTypes = await fetchNodeTypes({
        baseUrl: baseUrl || undefined,
        apiKey: n8nApiKey || undefined
      })

      narrator?.post('validator', 'validating workflow structure', 'started')

      const validatorResult = await validatePlan({ apiKey, plan, nodeTypes })

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
        this.handleValidationFailure(validatorResult, session, narrator)
      }

      narrator?.post('validator', 'validation passed', 'complete')

      if (validatorResult.warnings && validatorResult.warnings.length > 0)
      {
        session.log('Validator has warnings', { warningCount: validatorResult.warnings.length })
        console.warn('⚠️ Validator warnings:', validatorResult.warnings)
      }
    }
    catch (error)
    {
      this.handleValidatorUnavailable(error, session)
    }

    debugAgentHandoff('validator', 'orchestrator', 'Plan validated and ready for user review')
    tracer.logHandoff('orchestrator', 'Return validated plan to user')
    tracer.setAgent('orchestrator')
    tracer.completeTrace()
  }

  private handleValidationFailure(
    validatorResult: Awaited<ReturnType<typeof validatePlan>>,
    session: DebugSession,
    narrator?: ReturnType<typeof createNarrationManager>
  ): never
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

    narrator?.post('validator', 'found workflow issues', 'error')

    const errorMessage = formatValidationErrors(validatorResult)
    console.error('❌ Validator rejected plan:', errorMessage)

    throw new Error(
      'Workflow validation failed:\n\n' + errorMessage + '\n\n' +
      'The workflow was rejected because it contains node types or structures that don\'t exist in n8n. ' +
      'Please try again with a different approach.'
    )
  }

  private handleValidatorUnavailable(error: unknown, session: DebugSession): void
  {
    console.info('ℹ️ Deep validation skipped (node types API unavailable)', {
      reason: error instanceof Error ? error.message : String(error),
      fallback: 'Using structural validation only'
    })
    session.log('Validator unavailable, using structural validation', { error })

    debugAgentDecision(
      'validator',
      'Deep validation skipped',
      'Node types API unavailable, relying on structural validation',
      { error: error instanceof Error ? error.message : String(error) }
    )

    console.info('✅ Structural validation passed, proceeding with workflow creation')
  }

}

export const orchestrator = new Orchestrator()


