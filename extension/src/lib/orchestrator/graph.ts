import { StateGraph, START, MemorySaver } from '@langchain/langgraph'
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons'
import { AsyncLocalStorage } from 'node:async_hooks'

import { OrchestratorState } from './state'
import {
  enrichmentNode,
  enrichmentToolsNode,
  plannerNode,
  plannerToolsNode,
  validatorNode,
  executorNode,
  executorToolsNode
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

// Add all agent nodes
graph.addNode('enrichment', enrichmentNode)
graph.addNode('planner', plannerNode)
graph.addNode('validator', validatorNode)
graph.addNode('executor', executorNode)

// Add tool execution nodes
graph.addNode('enrichment_tools', enrichmentToolsNode)
graph.addNode('planner_tools', plannerToolsNode)
graph.addNode('executor_tools', executorToolsNode)

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

// Enrichment ↔ Enrichment Tools loop
// Enrichment node uses Command to route to enrichment_tools or END
graph.addEdge('enrichment_tools' as any, 'enrichment' as any)  // Tools always return to enrichment

// Orchestrator-based routing after enrichment
graph.addConditionalEdges(
  'enrichment' as any,
  (state) => {
    // Orchestrator decides based on enrichment agent's status report
    if (state.hasAllRequiredInfo && state.confidence > 0.8) {
      return 'planner'
    }
    return 'END' // Continue conversation (enrichment will be called again)
  }
)

// Planner ↔ Planner Tools loop
// Planner node uses Command to route to planner_tools or validator
graph.addEdge('planner_tools' as any, 'planner' as any)  // Tools always return to planner

// Validator → Executor
// Validator node uses Command to route to executor

// Executor ↔ Executor Tools loop
// Executor node uses Command to route to executor_tools or END
graph.addEdge('executor_tools' as any, 'executor' as any)  // Tools always return to executor

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

