import { Command } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { plannerTools } from '../tools/planner'
import { debugAgentDecision } from '../../utils/debug'

/**
 * Dedicated tool execution node for the planner agent.
 *
 * Executes tools like fetch_n8n_node_types and get_node_docs,
 * then routes back to the planner with the tool results.
 *
 * Flow:
 * Planner → Planner Tools (execute) → Planner (continue with results)
 */
export async function plannerToolsNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  debugAgentDecision('planner_tools', 'Executing tools', 'Running planner tools', {
    messageCount: state.messages.length
  })

  // Create tool node with planner-specific tools
  const toolNode = new ToolNode(plannerTools)

  // Execute tools
  const result = await toolNode.invoke(
    { messages: state.messages },
    config
  )

  debugAgentDecision('planner_tools', 'Tools executed', 'Returning results to planner', {
    resultCount: result.messages.length
  })

  // Always return to planner after tool execution
  return new Command({
    goto: 'planner',
    update: {
      messages: result.messages
    }
  })
}

