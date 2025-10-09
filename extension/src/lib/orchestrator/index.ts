import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import type { BackgroundMessage } from '../types/messaging'
import { parse as parseLoom } from '../loom'
import { stripCodeFences } from '../utils/markdown'
import { createAgentTracer } from '../ai/tracing'
import { debugLLMResponse, debugLoomParsing, debugPlanGenerated, DebugSession, debugAgentDecision, debugAgentHandoff } from '../utils/debug'
import { validateWorkflow, formatValidationResult } from '../validation/workflow'

import { loomToPlan } from './plan-converter'
import { createNarrationManager } from './narration'
import { invokeEnrichmentForChat, checkReadinessToPlan } from './agents/enrichment'
import { invokePlannerAgent } from './agents/planner'
import { runDeepValidation } from './agents/validator-runner'

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
    return invokeEnrichmentForChat(input.apiKey, input.messages, onToken)
  }

  public async isReadyToPlan(input: OrchestratorInput): Promise<{ ready: boolean; reason?: string }>
  {
    return checkReadinessToPlan(input.apiKey, input.messages)
  }

  public async plan(input: OrchestratorInput, postHandler?: ActivityHandler): Promise<Plan>
  {
    const session = new DebugSession('Orchestrator', 'plan')
    session.log('Starting plan generation', { messageCount: input.messages.length })

    this.initializeTracing(session)

    const narrator = postHandler ? createNarrationManager(postHandler, input.apiKey) : undefined
    const userIntent = input.messages[input.messages.length - 1]?.text || 'workflow automation'

    const onNarrate = (action: string, phase: 'started' | 'complete' | 'error') => narrator?.post('planner', action, phase, userIntent)

    const loomResponse = await invokePlannerAgent(input.apiKey, input.messages, session, userIntent, onNarrate)
    const plan = this.parsePlanFromLoom(loomResponse, session)

    this.validatePlanStructure(plan, session)
    onNarrate('workflow design complete', 'complete')

    await runDeepValidation(plan, input.apiKey, session, (action, phase) => narrator?.post('validator', action, phase))

    session.end(true)
    return plan
  }

  private initializeTracing(session: DebugSession): void
  {
    const tracer = createAgentTracer(session.getSessionId())
    tracer.setAgent('orchestrator')
    tracer.logDecision('Starting plan generation', 'User requested workflow plan')

    debugAgentHandoff('orchestrator', 'planner', 'Generate workflow plan from conversation')
    tracer.logHandoff('planner', 'Generate structured workflow from user requirements')
    tracer.setAgent('planner')
  }

  private parsePlanFromLoom(loomResponse: string, session: DebugSession): Plan
  {
    debugLLMResponse(loomResponse, '')
    session.log('LLM response received', { responseLength: loomResponse.length })

    const cleanedResponse = stripCodeFences(loomResponse)
    const parsed = parseLoom(cleanedResponse)

    if (!parsed.success || !parsed.data)
    {
      this.handleLoomParsingFailure(cleanedResponse, parsed, session)
    }

    debugLoomParsing(cleanedResponse, parsed.data, true)
    session.log('Loom parsing succeeded')

    const plan = loomToPlan(parsed.data)

    debugAgentDecision('planner', 'Plan generated successfully', 'Converted Loom to workflow plan', {
      nodeCount: plan.workflow.nodes?.length || 0,
      credentialsNeeded: plan.credentialsNeeded?.length || 0
    })

    return plan
  }

  private handleLoomParsingFailure(cleanedResponse: string, parsed: any, session: DebugSession): never
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

  private validatePlanStructure(plan: Plan, session: DebugSession): void
  {
    session.log('Validating workflow structure')
    const validation = validateWorkflow(plan.workflow)

    debugPlanGenerated({ plan, validation, sessionId: session.getSessionId() })

    if (!validation.valid) this.logValidationErrors(validation, session)
    else if (validation.warnings.length > 0) this.logValidationWarnings(validation, session)
    else session.log('Workflow validation passed')
  }

  private logValidationErrors(validation: ReturnType<typeof validateWorkflow>, session: DebugSession): void
  {
    session.log('Workflow validation failed', {
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    })
    console.warn('⚠️ Workflow validation issues detected:', formatValidationResult(validation))

    debugAgentDecision('planner', 'Validation failed', 'Workflow has structural issues', {
      errors: validation.errors.length,
      warnings: validation.warnings.length
    })
  }

  private logValidationWarnings(validation: ReturnType<typeof validateWorkflow>, session: DebugSession): void
  {
    session.log('Workflow has warnings', { warningCount: validation.warnings.length })
    console.warn('⚠️ Workflow validation warnings:', formatValidationResult(validation))
  }


}

export const orchestrator = new Orchestrator()


