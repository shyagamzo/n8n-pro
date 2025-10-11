import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import { workflowGraph } from './graph'
import { TokenStreamHandler } from './streaming'
import { DebugCallbackHandler } from './debug-handler'
import { DebugSession } from '../utils/debug'

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
   * @returns Response string
   */
  public async handle(
    input: OrchestratorInput,
    onToken?: StreamTokenHandler
  ): Promise<string>
  {
    const config = {
      configurable: {
        thread_id: `chat-${this.threadId}`,
        openai_api_key: input.apiKey,
        model: 'gpt-4o-mini'
      },
      callbacks: onToken ? [new TokenStreamHandler(onToken)] : []
    }

    // Convert ChatMessage[] to LangChain BaseMessage[]
    const lcMessages = this.convertMessages(input.messages)

    // Use streamEvents - single execution that provides both result and events
    const eventStream = workflowGraph.streamEvents(
      {
        mode: 'chat' as const,
        messages: lcMessages,
        sessionId: this.threadId
      },
      { ...config, version: 'v2' }
    )

    // Process event stream: emit events to reactive system AND collect final state
    let finalState: any = null
    for await (const event of eventStream) {
      // Emit to reactive system via bridge logic (inline to avoid double consumption)
      this.emitEventToReactiveSystem(event)
      
      // Capture final state
      if (event.event === 'on_chain_end' && event.data?.output) {
        finalState = event.data.output
      }
    }

    // Extract last message content
    const lastMessage = finalState?.messages?.[finalState.messages.length - 1]
    return (lastMessage?.content as string) || ''
  }

  /**
   * Check if enrichment conversation is ready to transition to planning.
   *
   * With the new tool-based architecture, readiness is determined by the enrichment agent
   * via tool calls that update the state. This method checks the current state.
   *
   * @param input - API key and message history
   * @returns Whether ready to plan and reason if not
   */
  public async isReadyToPlan(
    input: OrchestratorInput
  ): Promise<{ ready: boolean; reason?: string }>
  {
    if (!input.apiKey) {
      return { ready: false, reason: 'API key not provided' }
    }

    try {
      const config = {
        configurable: {
          thread_id: `readiness-check-${this.threadId}`,
          openai_api_key: input.apiKey,
          model: 'gpt-4o-mini'
        }
      }

      const lcMessages = this.convertMessages(input.messages)
      
      // Use streamEvents for single execution
      const eventStream = workflowGraph.streamEvents(
        {
          mode: 'chat' as const,
          messages: lcMessages,
          sessionId: this.threadId
        },
        { ...config, version: 'v2' }
      )

      // Collect final state and emit events
      let finalState: any = null
      for await (const event of eventStream) {
        this.emitEventToReactiveSystem(event)
        if (event.event === 'on_chain_end' && event.data?.output) {
          finalState = event.data.output
        }
      }

      // Check if enrichment agent reported readiness via tool calls
      const lastMessage = finalState?.messages?.[finalState.messages.length - 1] as any
      if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
        for (const toolCall of lastMessage.tool_calls) {
          if (toolCall.name === 'reportRequirementsStatus') {
            const args = toolCall.args as { hasAllRequiredInfo: boolean; confidence: number }
            if (args.hasAllRequiredInfo && args.confidence > 0.8) {
              return { ready: true }
            }
          }
        }
      }

      return {
        ready: false,
        reason: 'Continue chatting to gather requirements. Ask me about your workflow idea!'
      }
    } catch (error) {
      const { emitApiError } = require('../events')
      emitApiError(error as Error, 'readiness-check')
      return { ready: false, reason: 'Continue chatting to gather requirements. Ask me about your workflow idea!' }
    }
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

    // Use streamEvents for single execution with event capture
    const eventStream = workflowGraph.streamEvents(
      {
        mode: 'workflow' as const,
        messages: lcMessages,
        sessionId: this.threadId
      },
      { ...config, version: 'v2' }
    )

    // Collect final state and emit events
    let finalState: any = null
    for await (const event of eventStream) {
      this.emitEventToReactiveSystem(event)
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

    // Use streamEvents for single execution (null input = resume from checkpoint)
    const eventStream = workflowGraph.streamEvents(null, { ...config, version: 'v2' })

    // Collect final state and emit events
    let finalState: any = null
    for await (const event of eventStream) {
      this.emitEventToReactiveSystem(event)
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

  /**
   * Emit LangGraph events to reactive system (inline bridge logic).
   * This avoids double-consumption of the async generator.
   */
  private emitEventToReactiveSystem(event: any): void
  {
    const { event: eventType, name, data, metadata } = event
    
    // Import emitters at top of file
    const { systemEvents, emitAgentStarted, emitAgentCompleted, emitLLMStarted, emitLLMCompleted } = require('../events')
    
    switch (eventType) {
      case 'on_llm_start':
        emitLLMStarted(metadata?.ls_model_name, metadata?.ls_provider, metadata?.run_id)
        break
        
      case 'on_llm_end':
        emitLLMCompleted(data?.output?.usage_metadata, metadata?.run_id)
        break
        
      case 'on_llm_error':
        systemEvents.emit({
          domain: 'error',
          type: 'llm',
          payload: {
            error: data?.error || new Error('LLM error'),
            source: 'langchain',
            context: { name, metadata }
          },
          timestamp: Date.now()
        })
        break
        
      case 'on_tool_start':
        systemEvents.emit({
          domain: 'agent',
          type: 'tool_started',
          payload: {
            agent: 'executor',
            tool: name || 'unknown',
            metadata: { input: data?.input, ...metadata }
          },
          timestamp: Date.now()
        })
        break
        
      case 'on_tool_end':
        systemEvents.emit({
          domain: 'agent',
          type: 'tool_completed',
          payload: {
            agent: 'executor',
            tool: name || 'unknown',
            metadata: { output: data?.output, ...metadata }
          },
          timestamp: Date.now()
        })
        break
        
      case 'on_chain_start':
        if (name?.toLowerCase().includes('planner')) {
          emitAgentStarted('planner', 'planning', metadata)
        } else if (name?.toLowerCase().includes('executor')) {
          emitAgentStarted('executor', 'executing', metadata)
        } else if (name?.toLowerCase().includes('enrichment')) {
          emitAgentStarted('enrichment', 'enriching', metadata)
        } else if (name?.toLowerCase().includes('classifier')) {
          emitAgentStarted('classifier', 'classifying', metadata)
        }
        break
        
      case 'on_chain_end':
        if (name?.toLowerCase().includes('planner')) {
          emitAgentCompleted('planner', metadata)
        } else if (name?.toLowerCase().includes('executor')) {
          emitAgentCompleted('executor', metadata)
        } else if (name?.toLowerCase().includes('enrichment')) {
          emitAgentCompleted('enrichment', metadata)
        } else if (name?.toLowerCase().includes('classifier')) {
          emitAgentCompleted('classifier', metadata)
        }
        break
    }
  }
}

/**
 * Default orchestrator instance (singleton pattern).
 * Maintained for backward compatibility.
 */
export const orchestrator = new ChatOrchestrator()

