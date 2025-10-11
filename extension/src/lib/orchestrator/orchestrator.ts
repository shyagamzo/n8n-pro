import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import { workflowGraph } from './graph'
import { TokenStreamHandler } from './streaming'
import { emitLangGraphEvent } from '../events/langchain-bridge'

/**
 * Orchestrator input for chat and workflow operations.
 * Maintained for backward compatibility with existing background script.
 */
export type OrchestratorInput = {
  apiKey: string
  messages: ChatMessage[]
}

export type StreamTokenHandler = (token: string) => void

/**
 * ChatOrchestrator - Thin wrapper around LangGraph workflow graph.
 *
 * The graph is self-contained with orchestrator node handling all routing.
 * This class only manages session IDs and provides a clean API.
 *
 * Graph Flow (Automatic):
 * START → orchestrator → enrichment ⟲ orchestrator → planner → executor → END
 *
 * Features:
 * - Session persistence via checkpointer and thread_id
 * - Token streaming for real-time UI updates
 * - Reactive event system (automatic via LangGraph bridge)
 * - Orchestrator node routes based on enrichment's tool calls
 * - Interrupt before executor for user approval
 *
 * Usage:
 * ```typescript
 * const orchestrator = new ChatOrchestrator(sessionId)
 *
 * // Single execution - graph handles chat → workflow transition automatically
 * const result = await orchestrator.run(input, onToken)
 *
 * // If paused at executor interrupt, resume workflow creation
 * await orchestrator.applyWorkflow(apiKey, n8nApiKey)
 * ```
 */
export class ChatOrchestrator
{
  private threadId: string

  constructor(sessionId?: string)
  {
    this.threadId = sessionId || crypto.randomUUID()
  }

  /**
   * Run graph - handles both chat and workflow automatically.
   * Graph's orchestrator node routes based on conversation state.
   *
   * @param input - API key and message history
   * @param onToken - Optional callback for token streaming
   * @returns Final state with response, plan (if ready), and status
   */
  public async run(
    input: OrchestratorInput,
    onToken?: StreamTokenHandler
  ): Promise<{
    response: string
    plan?: Plan
    paused: boolean  // True if paused at executor interrupt
  }>
  {
    const config = {
      configurable: {
        thread_id: this.threadId,
        openai_api_key: input.apiKey,
        model: 'gpt-4o-mini'
      },
      callbacks: onToken ? [new TokenStreamHandler(onToken)] : []
    }

    const lcMessages = this.convertMessages(input.messages)

    // Stream events and collect final state
    const eventStream = workflowGraph.streamEvents(
      { messages: lcMessages, sessionId: this.threadId },
      { ...config, version: 'v2' }
    )

    let finalState: any = null
    for await (const event of eventStream) {
      emitLangGraphEvent(event)
      if (event.event === 'on_chain_end' && event.data?.output) {
        finalState = event.data.output
      }
    }

    const lastMessage = finalState?.messages?.[finalState.messages.length - 1]
    const response = (lastMessage?.content as string) || ''

    return {
      response,
      plan: finalState?.plan,
      paused: !!finalState?.plan && !finalState?.workflowId  // Has plan but no workflow = paused
    }
  }

  /**
   * Legacy method for backwards compatibility
   * @deprecated Use run() instead
   */
  public async handle(
    input: OrchestratorInput,
    onToken?: StreamTokenHandler
  ): Promise<{ response: string; ready: boolean }>
  {
    const result = await this.run(input, onToken)
    return {
      response: result.response,
      ready: !!result.plan  // Has plan = ready
    }
  }

  /**
   * Legacy method for backwards compatibility
   * @deprecated Graph now handles this automatically via run()
   */
  public async plan(input: OrchestratorInput): Promise<Plan>
  {
    const result = await this.run(input)
    if (!result.plan) {
      throw new Error('Graph did not generate a plan')
    }
    return result.plan
  }

  /**
   * Apply workflow (resume from executor interrupt).
   *
   * Creates the workflow in n8n after user approval.
   *
   * @param openaiApiKey - OpenAI API key
   * @param n8nApiKey - n8n API key for workflow creation
   * @returns Workflow ID and optional credential guidance
   */
  public async applyWorkflow(
    openaiApiKey: string,
    n8nApiKey: string
  ): Promise<{
    workflowId?: string
    credentialGuidance?: {
      missing: Array<{ name: string; type: string }>
      setupLinks: Array<{ name: string; url: string }>
    }
  }>
  {
    const config = {
      configurable: {
        thread_id: this.threadId,  // Same thread as chat
        openai_api_key: openaiApiKey,
        n8n_api_key: n8nApiKey,
        n8n_base_url: 'http://localhost:5678',
        model: 'gpt-4o-mini'
      }
    }

    // Resume from checkpoint (null input = continue from where we paused)
    const eventStream = workflowGraph.streamEvents(null, { ...config, version: 'v2' })

    let finalState: any = null
    for await (const event of eventStream) {
      emitLangGraphEvent(event)
      if (event.event === 'on_chain_end' && event.data?.output) {
        finalState = event.data.output
      }
    }

    return {
      workflowId: finalState?.workflowId,
      credentialGuidance: finalState?.credentialGuidance
    }
  }

  /**
   * Get the session ID for this orchestrator instance.
   */
  public getSessionId(): string
  {
    return this.threadId
  }

  /**
   * Convert ChatMessage[] to LangChain BaseMessage[].
   */
  private convertMessages(messages: ChatMessage[]): Array<HumanMessage | AIMessage | SystemMessage>
  {
    return messages.map(msg =>
    {
      if (msg.role === 'system')
      {
        return new SystemMessage(msg.text)
      }
      else if (msg.role === 'assistant')
      {
        return new AIMessage(msg.text)
      }
      else
      {
        return new HumanMessage(msg.text)
      }
    })
  }
}

/**
 * Default orchestrator instance (singleton pattern).
 * Maintained for backward compatibility.
 */
export const orchestrator = new ChatOrchestrator()

