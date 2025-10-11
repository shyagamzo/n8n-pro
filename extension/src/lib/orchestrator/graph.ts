import { StateGraph, START, MemorySaver } from '@langchain/langgraph'
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons'
import { AsyncLocalStorage } from 'node:async_hooks'

import { OrchestratorState } from './state'
import {
  enrichmentNode,
  plannerNode,
  validatorNode,
  executorNode
} from './nodes'

/**
 * Initialize AsyncLocalStorage for browser environment.
 * This is required for interrupt() to work properly in LangGraph nodes.
 *
 * In Node.js, LangGraph auto-initializes this, but in browser environments
 * we need to manually initialize it with our polyfilled AsyncLocalStorage.
 */
AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new AsyncLocalStorage())

/**
 * Build the unified LangGraph orchestrator.
 *
 * Graph Structure:
 *
 * START → [mode routing]
 *   ├─→ 'chat' mode: enrichment → END
 *   │   └─→ (enrichment may loop via interrupt)
 *   │
 *   └─→ 'workflow' mode: planner → validator → executor → END
 *       ├─→ planner ↔ planner_tools (loop for tool execution)
 *       └─→ executor ↔ executor_tools (loop for tool execution)
 *
 * Interrupts:
 * - enrichment: Uses interrupt() for clarification
 * - executor: Pauses before execution (interruptBefore config)
 */

const graph = new StateGraph(OrchestratorState)

// Add all agent nodes (all use createReactAgent)
graph.addNode('enrichment', enrichmentNode)
graph.addNode('planner', plannerNode)
graph.addNode('validator', validatorNode)
graph.addNode('executor', executorNode)

// Entry routing based on mode
graph.addConditionalEdges(
  START,
  (state) => {
    if (state.mode === 'chat')
    {
      return 'enrichment'
    }
    else if (state.mode === 'workflow')
    {
      return 'planner'
    }
    else
    {
      throw new Error(`Invalid mode: ${state.mode}. Must be 'chat' or 'workflow'.`)
    }
  }
)

// Orchestrator-based routing after enrichment
// Enrichment agent uses createReactAgent which handles tools internally
graph.addConditionalEdges(
  'enrichment' as any,
  (state) => {
    // Orchestrator reads tool call arguments directly from the last message
    const lastMessage = state.messages[state.messages.length - 1] as any
    
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      for (const toolCall of lastMessage.tool_calls) {
        if (toolCall.name === 'reportRequirementsStatus') {
          const args = toolCall.args as { hasAllRequiredInfo: boolean; confidence: number }
          if (args.hasAllRequiredInfo && args.confidence > 0.8) {
            return 'planner'
          }
        }
      }
    }
    
    return 'END' // Continue conversation
  }
)

// All agents now use createReactAgent which handles tool loops internally
// No need for separate tool execution nodes

// Planner → Validator (via Command in planner node)
// Validator → Executor (via Command in validator node)
// Executor → END (via Command in executor node)

/**
 * Compile the graph with checkpointer and interrupt configuration.
 *
 * Checkpointer: MemorySaver for in-memory session persistence
 * InterruptBefore: Pause before executor node for user approval
 */
const checkpointer = new MemorySaver()

export const workflowGraph = graph.compile({
  checkpointer,
  interruptBefore: ['executor' as any]  // Pause before creating workflow in n8n
})

