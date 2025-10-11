import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import { workflowGraph } from './graph'
import { TokenStreamHandler } from './streaming'
import { DebugCallbackHandler } from './debug-handler'
import { DebugSession } from '../utils/debug'
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
 * ChatOrchestrator - LangGraph-based multi-agent orchestrator.
 *
 * Manages conversation state across two modes:
 * - Chat mode: Enrichment agent for conversational interaction
 * - Workflow mode: Planner → Validator → Executor for workflow creation
 *
 * Features:
 * - Session persistence via checkpointer and thread_id
 * - Token streaming for real-time UI updates
 * - Reactive event system (automatic via LangGraph bridge)
 * - Debug tracing via callback handlers and DebugSession
 * - Two interrupt points: enrichment (clarification) and executor (approval)
 *
 * Usage:
 * ```typescript
 * const orchestrator = new ChatOrchestrator(sessionId)
 *
 * // Chat mode
 * const response = await orchestrator.handle(input, onToken)
 *
 * // Workflow mode
 * const plan = await orchestrator.plan(input)
 * await orchestrator.applyWorkflow(input.apiKey, n8nApiKey)
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
   * Handle chat messages (enrichment mode).
   *
   * @param input - API key and message history
   * @param onToken - Optional callback for token streaming
   * @returns Response string and readiness status
   */
  public async handle(
    input: OrchestratorInput,
    onToken?: StreamTokenHandler
  ): Promise<{ response: string; ready: boolean }>
  {
    const config = {
      configurable: {
        thread_id: `chat-${this.threadId}`,
        openai_api_key: input.apiKey,
        model: 'gpt-4o-mini'
      },
      callbacks: onToken ? [new TokenStreamHandler(onToken)] : []
    }

    const lcMessages = this.convertMessages(input.messages)

    // Stream events and collect final state
    const eventStream = workflowGraph.streamEvents(
      {
        mode: 'chat' as const,
        messages: lcMessages,
        sessionId: this.threadId
      },
      { ...config, version: 'v2' }
    )

    // Process events: emit to reactive system and collect final state
    let finalState: any = null
    for await (const event of eventStream) {
      emitLangGraphEvent(event)
      if (event.event === 'on_chain_end' && event.data?.output) {
        finalState = event.data.output
      }
    }

    const lastMessage = finalState?.messages?.[finalState.messages.length - 1]
    const response = (lastMessage?.content as string) || ''
    
    // Check if enrichment reported readiness via tool calls
    let ready = false
    if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
      for (const toolCall of lastMessage.tool_calls) {
        if (toolCall.name === 'reportRequirementsStatus') {
          const args = toolCall.args as { hasAllRequiredInfo: boolean; confidence: number }
          if (args.hasAllRequiredInfo && args.confidence > 0.8) {
            ready = true
            break
          }
        }
      }
    }
    
    return { response, ready }
  }

  /**
   * Create workflow plan (planner → validator → executor).
   *
   * Runs until executor interrupt - returns plan for UI preview.
   * Call applyWorkflow() to resume and create the workflow in n8n.
   *
   * @param input - API key and message history
   * @returns Generated and validated workflow plan
   */
  public async plan(
    input: OrchestratorInput
  ): Promise<Plan>
  {
    const session = new DebugSession('Orchestrator', 'plan')
    session.log('Starting plan generation', { messageCount: input.messages.length })

    const config = {
      configurable: {
        thread_id: `workflow-${this.threadId}`,
        openai_api_key: input.apiKey,
        n8n_api_key: '', // Will be provided in applyWorkflow
        model: 'gpt-4o-mini'
      },
      callbacks: [new DebugCallbackHandler(session)],
      metadata: {
        session
      }
    }

    const lcMessages = this.convertMessages(input.messages)

    // Stream events and collect final state
    const eventStream = workflowGraph.streamEvents(
      {
        mode: 'workflow' as const,
        messages: lcMessages,
        sessionId: this.threadId
      },
      { ...config, version: 'v2' }
    )

    // Process events and collect final state
    let finalState: any = null
    for await (const event of eventStream) {
      emitLangGraphEvent(event)
      if (event.event === 'on_chain_end' && event.data?.output) {
        finalState = event.data.output
      }
    }

    session.end(true)

    if (!finalState?.plan)
    {
      throw new Error('Failed to generate workflow plan')
    }

    return finalState.plan
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
        thread_id: `workflow-${this.threadId}`,
        openai_api_key: openaiApiKey,
        n8n_api_key: n8nApiKey,
        n8n_base_url: 'http://localhost:5678',
        model: 'gpt-4o-mini'
      }
    }

    // Stream events and collect final state (null input = resume from checkpoint)
    const eventStream = workflowGraph.streamEvents(null, { ...config, version: 'v2' })

    // Process events and collect final state
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

