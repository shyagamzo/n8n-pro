import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

import type { ChatMessage } from '@shared/types/chat'
import type { Plan } from '@shared/types/plan'
import { workflowGraph } from './graph'
import { TokenStreamHandler } from './streaming'
import { emitLangGraphEvent } from '@events/langchain-bridge'
import { emitSystemError, emitAgentStarted, emitWorkflowCreated } from '@events/emitters'

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
function convertMessages(messages: ChatMessage[]): Array<HumanMessage | AIMessage | SystemMessage> 
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
 * Checkpoint Resumption:
 * - When messages array is empty, attempts to resume from checkpoint
 * - Validates checkpoint exists and is at executor interrupt
 * - Uses stream() instead of streamEvents() for proper checkpoint support
 * - Emits events via LangGraph bridge for UI updates
 *
 * @param input - Session ID, API keys, and message history
 * @param onToken - Optional callback for token streaming
 * @returns Final state with response, plan (if generated), and workflow ID (if created)
 */
export async function runGraph(
  input: GraphInput,
  onToken?: StreamTokenHandler
): Promise<GraphResult> 
{
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

  // Detect checkpoint resumption scenario (apply_plan sends empty messages)
  const isResumingFromCheckpoint = lcMessages.length === 0

  if (isResumingFromCheckpoint) 
{
    try 
{
      // Validate checkpoint exists and is at executor interrupt
      const state = await workflowGraph.getState(config)

      // Check if graph already completed
      if (state.next.length === 0) 
{
        throw new Error('Workflow already created. Cannot apply plan again.')
      }

      // Verify we're paused at executor node (interruptBefore: ['executor'])
      const isPausedAtExecutor = state.next.includes('executor')

      if (!isPausedAtExecutor) 
{
        // Checkpoint exists but not at executor - invalid state
        throw new Error(
          `Cannot apply plan: workflow is in "${state.next[0]}" state, expected "executor". ` +
          'Please create a new workflow request.'
        )
      }

      // Emit agent started event manually (stream() won't emit on_chain_start for resume)
      emitAgentStarted('executor', 'creating workflow in n8n', {}, input.sessionId)

      // Resume from checkpoint using stream() for proper event emission
      // stream() properly handles checkpoint resumption AND emits state updates
      const streamResult = await workflowGraph.stream(null, {
        ...config,
        streamMode: ['values']  // Stream complete state after each node
      })

      let finalState: any = null

      // Iterate through state updates (should only be one - executor completion)
      for await (const stateSnapshot of streamResult) 
{
        // Each iteration is a complete state snapshot after a node executes
        // For resumption from executor interrupt, we get one snapshot: post-executor state
        finalState = stateSnapshot
      }

      const lastMessage = finalState?.messages?.[finalState.messages.length - 1]
      const response = (lastMessage?.content as string) || ''

      // Emit workflow created event if workflow was successfully created
      if (finalState?.workflowId && finalState?.plan)
      {
        emitWorkflowCreated(
          {
            id: finalState.workflowId,
            name: finalState.plan.workflow?.name || 'Unnamed Workflow'
          },
          finalState.workflowId
        )
      }

      return {
        response,
        plan: finalState?.plan,
        workflowId: finalState?.workflowId,
        paused: false  // After executor runs, graph completes (executor → END)
      }
    }
 catch (error) 
{
      // Checkpoint validation or resumption failed
      const err = error as Error
      emitSystemError(err, 'checkpoint-resumption', {
        sessionId: input.sessionId,
        errorType: err.name,
        errorMessage: err.message
      })
      throw new Error(`Failed to resume workflow: ${err.message}`)
    }
  }

  // Initial run - use streamEvents() for detailed observability
  const eventStream = workflowGraph.streamEvents(
    { messages: lcMessages, sessionId: input.sessionId },
    { ...config, version: 'v2' }
  )

  let finalState: any = null

  for await (const event of eventStream) 
{
    emitLangGraphEvent(event)

    if (event.event === 'on_chain_end' && event.data?.output) 
{
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
