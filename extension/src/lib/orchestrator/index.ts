import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import type { BackgroundMessage } from '../types/messaging'
import { workflowGraph } from './graph'
import { TokenStreamHandler } from './streaming'
import { DebugCallbackHandler } from './debug-handler'
import { DebugSession } from '../utils/debug'
import { createNarrationManager } from './narration'

/**
 * Orchestrator input for chat and workflow operations.
 * Maintained for backward compatibility with existing background script.
 */
export type OrchestratorInput = {
  apiKey: string
  messages: ChatMessage[]
}

export type StreamTokenHandler = (token: string) => void
export type ActivityHandler = (message: BackgroundMessage) => void

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
 * - Progress updates via narrator system
 * - Debug tracing via callback handlers
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
 * const plan = await orchestrator.plan(input, postHandler)
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

    const result = await workflowGraph.invoke(
      {
        mode: 'chat' as const,
        messages: lcMessages,
        sessionId: this.threadId
      },
      config
    )

    // Extract last message content
    const lastMessage = result.messages[result.messages.length - 1]
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
    // In the new architecture, readiness is determined by tool calls from the enrichment agent
    // We need to run the enrichment agent to see if it calls markReady tool
    
    if (!input.apiKey) {
      return { ready: false, reason: 'API key not provided' }
    }

    try {
      // Run enrichment agent to see if it determines readiness
      const config = {
        configurable: {
          thread_id: `readiness-check-${this.threadId}`,
          openai_api_key: input.apiKey,
          model: 'gpt-4o-mini'
        }
      }

      const lcMessages = this.convertMessages(input.messages)
      const result = await workflowGraph.invoke(
        {
          mode: 'chat' as const,
          messages: lcMessages,
          sessionId: this.threadId
        },
        config
      )

      // Check if enrichment agent reported it has all required info
      if (result.hasAllRequiredInfo && result.confidence > 0.8) {
        return { ready: true }
      }

      return { 
        ready: false, 
        reason: 'Continue chatting to gather requirements. Ask me about your workflow idea!' 
      }
    } catch (error) {
      console.error('❌ Readiness check failed:', error)
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
   * @param postHandler - Optional handler for activity updates
   * @returns Generated and validated workflow plan
   */
  public async plan(
    input: OrchestratorInput,
    postHandler?: ActivityHandler
  ): Promise<Plan>
  {
    const session = new DebugSession('Orchestrator', 'plan')
    session.log('Starting plan generation', { messageCount: input.messages.length })

    // Create narrator for progress updates
    const narrator = postHandler
      ? createNarrationManager(postHandler, input.apiKey)
      : undefined

    const config = {
      configurable: {
        thread_id: `workflow-${this.threadId}`,
        openai_api_key: input.apiKey,
        n8n_api_key: '', // Will be provided in applyWorkflow
        model: 'gpt-4o-mini'
      },
      callbacks: [new DebugCallbackHandler(session)],
      metadata: {
        narrator,
        session
      }
    }

    // Convert ChatMessage[] to LangChain BaseMessage[]
    const lcMessages = this.convertMessages(input.messages)

    // Run workflow mode (planner → validator → [pause] → executor)
    const result = await workflowGraph.invoke(
      {
        mode: 'workflow' as const,
        messages: lcMessages,
        sessionId: this.threadId
      },
      config
    )

    session.end(true)

    if (!result.plan)
    {
      throw new Error('Failed to generate workflow plan')
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
        thread_id: `workflow-${this.threadId}`,
        openai_api_key: openaiApiKey,
        n8n_api_key: n8nApiKey,
        n8n_base_url: 'http://localhost:5678',
        model: 'gpt-4o-mini'
      }
    }

    // Resume from executor interrupt (null input = continue from checkpoint)
    const result = await workflowGraph.invoke(null, config)

    return {
      workflowId: result.workflowId,
      credentialGuidance: result.credentialGuidance
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

