import { StateGraph, START, MemorySaver } from '@langchain/langgraph'
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons'
import { AsyncLocalStorage } from 'node:async_hooks'

import { OrchestratorState } from './state'
import {
  enrichmentNode,
  plannerNode,
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
 *   │   (enrichment gathers requirements via tools: reportRequirementsStatus, setConfidence)
 *   │   (readiness check happens OUTSIDE graph in background-worker.ts)
 *   │
 *   └─→ 'workflow' mode: planner → executor → END
 *       (planner uses validator tool internally)
 *       (executor paused via interruptBefore for user approval)
 *
 * Mode Transitions:
 * - Chat mode runs independently (handle() method)
 * - After chat completes, background-worker checks readiness
 * - If ready, workflow mode runs separately (plan() method)
 * - Two separate graph executions, not a single flow
 *
 * Interrupts:
 * - executor: Pauses before execution (interruptBefore config)
 */

const graph = new StateGraph(OrchestratorState)

// Add all agent nodes (all use createReactAgent)
// Note: Validator is now a tool used by the planner, not a separate node
graph.addNode('enrichment', enrichmentNode)
graph.addNode('planner', plannerNode)
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

// Enrichment always ends (chat mode is separate from workflow mode)
// Readiness determination happens outside the graph in background-worker.ts
graph.addEdge('enrichment' as any, '__end__')

// All agents now use createReactAgent which handles tool loops internally
// No need for separate tool execution nodes
// Validator is now a tool within the planner

// Actual Flow:
// 1. Chat Mode:    START → enrichment → END (separate execution)
// 2. Workflow Mode: START → planner → [interrupt] → executor → END (separate execution)
//
// Transition between modes happens in background-worker.ts:
// - handle() runs chat mode
// - isReadyToPlan() checks if enrichment called reportRequirementsStatus(true)
// - plan() runs workflow mode if ready

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

