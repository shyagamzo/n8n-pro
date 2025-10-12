import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

import type { ChatMessage } from '@shared/types/chat'
import type { Plan } from '@shared/types/plan'
import { workflowGraph } from './graph'
import { TokenStreamHandler } from './streaming'
import { emitLangGraphEvent } from '@events/langchain-bridge'

/**
 * Input for graph execution
 */
export type GraphInput = {
  sessionId: string
  apiKey: string
  messages: ChatMessage[]
  n8nApiKey?: string
  n8nBaseUrl?: string
}

export type StreamTokenHandler = (token: string) => void

/**
 * Result from graph execution
 */
export type GraphResult = {
  response: string
  plan?: Plan
  workflowId?: string
  paused: boolean
}

/**
 * Convert ChatMessage[] to LangChain BaseMessage[]
 */
function convertMessages(messages: ChatMessage[]): Array<HumanMessage | AIMessage | SystemMessage> {
  return messages.map(msg => {
    if (msg.role === 'system') {
      return new SystemMessage(msg.text)
    } else if (msg.role === 'assistant') {
      return new AIMessage(msg.text)
    } else {
      return new HumanMessage(msg.text)
    }
  })
}

/**
 * Run the workflow graph for a session.
 *
 * This is the ONLY entry point to the graph. All business logic
 * (routing, planning, execution) happens inside the graph via nodes and tools.
 *
 * Graph Flow (Automatic):
 * START → orchestrator → enrichment ⟲ orchestrator → planner → executor → END
 *
 * Features:
 * - Session persistence via checkpointer and thread_id
 * - Token streaming for real-time UI updates
 * - Reactive event system (automatic)
 * - Orchestrator node routes based on state
 * - Executor pauses for user approval (interruptBefore)
 *
 * @param input - Session ID, API keys, and message history
 * @param onToken - Optional callback for token streaming
 * @returns Final state with response, plan (if generated), and workflow ID (if created)
 */
export async function runGraph(
  input: GraphInput,
  onToken?: StreamTokenHandler
): Promise<GraphResult> {
  const config = {
    configurable: {
      thread_id: input.sessionId,
      openai_api_key: input.apiKey,
      n8n_api_key: input.n8nApiKey || '',
      n8n_base_url: input.n8nBaseUrl,  // Already defaulted by background-worker
      model: 'gpt-4o-mini'
    },
    callbacks: onToken ? [new TokenStreamHandler(onToken)] : []
  }

  const lcMessages = convertMessages(input.messages)

  // Stream events and collect final state
  const eventStream = workflowGraph.streamEvents(
    { messages: lcMessages, sessionId: input.sessionId },
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
    workflowId: finalState?.workflowId,
    paused: !!finalState?.plan && !finalState?.workflowId
  }
}

