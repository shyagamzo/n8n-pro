import { Command } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { executorTools } from '../tools/executor'
import { debugAgentDecision } from '../../utils/debug'

/**
 * Dedicated tool execution node for the executor agent.
 * 
 * Executes tools like create_n8n_workflow and check_credentials,
 * then routes back to the executor with the tool results.
 * 
 * Flow:
 * Executor → Executor Tools (execute) → Executor (continue with results)
 */
export async function executorToolsNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  debugAgentDecision('executor_tools', 'Executing tools', 'Running executor tools', {
    messageCount: state.messages.length
  })

  // Create tool node with executor-specific tools
  const toolNode = new ToolNode(executorTools)

  // Execute tools
  const result = await toolNode.invoke(
    { messages: state.messages },
    config
  )

  debugAgentDecision('executor_tools', 'Tools executed', 'Returning results to executor', {
    resultCount: result.messages.length
  })

  // Always return to executor after tool execution
  return new Command({
    goto: 'executor',
    update: {
      messages: result.messages
    }
  })
}

