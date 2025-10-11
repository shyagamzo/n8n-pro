import { StateGraph, START, MemorySaver } from '@langchain/langgraph'
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons'
import { AsyncLocalStorage } from 'node:async_hooks'

import { OrchestratorState } from './state'
import {
  orchestratorNode,
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
 * Graph Structure (Self-Contained):
 *
 * START → orchestrator (pure routing function)
 *   ├─→ enrichment (gather requirements) → orchestrator (loop)
 *   ├─→ planner (create plan) → executor → END
 *   └─→ END (conversation complete)
 *
 * Orchestrator Node Routing Rules:
 * - No tool calls yet → enrichment (initial state)
 * - enrichment called reportRequirementsStatus(ready=false) → enrichment (more info needed)
 * - enrichment called reportRequirementsStatus(ready=true, conf>0.8) → planner (ready!)
 * - Otherwise → END (fallback)
 *
 * All routing happens INSIDE the graph via orchestrator node.
 * No external orchestration in background-worker needed!
 *
 * Agent Tools:
 * - Enrichment: reportRequirementsStatus, setConfidence
 * - Planner: validateWorkflow (validator as tool)
 * - Executor: (none - creates workflow in n8n)
 *
 * Interrupts:
 * - executor: Pauses before execution (interruptBefore config)
 */

const graph = new StateGraph(OrchestratorState)

// Add nodes
graph.addNode('orchestrator', orchestratorNode)  // Pure routing function (no LLM)
graph.addNode('enrichment', enrichmentNode)      // LLM agent with tools
graph.addNode('planner', plannerNode)            // LLM agent with tools
graph.addNode('executor', executorNode)          // LLM agent

// Routing edges
graph.addEdge(START, 'orchestrator' as any)             // Always start at orchestrator
graph.addEdge('enrichment' as any, 'orchestrator' as any)  // Enrichment loops back for re-evaluation

// Orchestrator routes via Command return value (goto: enrichment/planner/END)
// Planner → executor transition handled by Command in planner node
// Executor → END transition handled by Command in executor node

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

