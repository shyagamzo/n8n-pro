import { StateGraph, START, MemorySaver } from '@langchain/langgraph'
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons'
import { AsyncLocalStorage } from 'node:async_hooks'

import { OrchestratorState } from './state'
import {
  orchestratorNode,
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
 * Graph Structure (Self-Contained):
 *
 * START → orchestrator (pure routing function)
 *   ├─→ enrichment (gather requirements) → orchestrator
 *   ├─→ planner (create plan) → orchestrator
 *   ├─→ validator (validate plan) → orchestrator
 *   ├─→ executor (create workflow) → END
 *   └─→ END (workflow created)
 *
 * Orchestrator Node Routing Rules (checked in priority order):
 * 1. If workflowId exists → END
 * 2. If validationStatus exists → executor
 * 3. If plan exists (no validation) → validator
 * 4. If requirementsStatus.ready → planner
 * 5. Otherwise → enrichment
 *
 * Most routing happens via orchestrator node.
 * Enrichment, planner, and validator return to orchestrator.
 * Executor is a terminal node that completes the graph (goes directly to END).
 *
 * Agent Tools:
 * - Enrichment: reportRequirementsStatus, setConfidence
 * - Planner: fetch_n8n_node_types, get_node_docs
 * - Validator: fetch_n8n_node_types
 * - Executor: create_n8n_workflow, check_credentials
 *
 * Interrupts:
 * - executor: Pauses before execution (interruptBefore config)
 */

// Build graph with proper type inference by chaining addNode calls
const graph = new StateGraph(OrchestratorState)
  .addNode('orchestrator', orchestratorNode, {
    ends: ['enrichment', 'planner', 'validator', 'executor', '__end__']
  })
  .addNode('enrichment', enrichmentNode)   // LLM agent with requirement gathering tools
  .addNode('planner', plannerNode)         // LLM agent with n8n node type tools
  .addNode('validator', validatorNode)     // LLM agent with n8n node type tools
  .addNode('executor', executorNode)       // LLM agent with n8n API tools (terminal node)

// Routing edges - enrichment/planner/validator return to orchestrator
// Executor is a terminal node that goes directly to END
// TypeScript now knows all node names from chained addNode calls
graph.addEdge(START, 'orchestrator')
graph.addEdge('enrichment', 'orchestrator')
graph.addEdge('planner', 'orchestrator')
graph.addEdge('validator', 'orchestrator')
// Note: executor returns END via Command, no edge needed

// Orchestrator makes all routing decisions via Command return values
// Single source of truth for graph flow control

/**
 * Compile the graph with checkpointer and interrupt configuration.
 *
 * Checkpointer: MemorySaver for in-memory session persistence
 * InterruptBefore: Pause before executor node for user approval
 */
const checkpointer = new MemorySaver()

export const workflowGraph = graph.compile({
  checkpointer,
  interruptBefore: ['executor']  // Pause before creating workflow in n8n
})

