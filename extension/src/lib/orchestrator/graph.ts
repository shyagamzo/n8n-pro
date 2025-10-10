import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph'

import { OrchestratorState } from './state'
import {
  enrichmentNode,
  plannerNode,
  plannerToolsNode,
  validatorNode,
  executorNode,
  executorToolsNode
} from './nodes'

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
  },
  {
    enrichment: 'enrichment',
    planner: 'planner'
  }
)

// Enrichment node uses Command returns for routing
// No explicit edges needed - Command handles routing to END or back to enrichment

// Planner ↔ Planner Tools loop
// Planner node uses Command to route to planner_tools or validator
graph.addEdge('planner_tools', 'planner')  // Tools always return to planner

// Validator → Executor
// Validator node uses Command to route to executor

// Executor ↔ Executor Tools loop
// Executor node uses Command to route to executor_tools or END
graph.addEdge('executor_tools', 'executor')  // Tools always return to executor

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

