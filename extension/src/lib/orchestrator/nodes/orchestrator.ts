/**
 * Orchestrator Node - Pure Routing Function
 *
 * Analyzes conversation state and routes to appropriate agent.
 * No LLM calls - just reads enrichment's tool outputs and makes deterministic routing decisions.
 *
 * Routing Rules:
 * - If enrichment reported ready (hasAllRequiredInfo=true, confidence>0.8) → planner
 * - If enrichment reported not ready → enrichment (gather more info)
 * - If no tool calls yet → enrichment (initial state)
 * - Otherwise → END (fallback)
 */

import { Command } from '@langchain/langgraph'
import type { OrchestratorStateType } from '../state'
import type { RunnableConfig } from '@langchain/core/runnables'

/**
 * Orchestrator node - determines next agent based on current state
 */
export function orchestratorNode(
  state: OrchestratorStateType,
  _config?: RunnableConfig
): Command {
  const lastMessage = state.messages[state.messages.length - 1] as any

  // Check if enrichment called reportRequirementsStatus tool
  if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
    for (const toolCall of lastMessage.tool_calls) {
      if (toolCall.name === 'reportRequirementsStatus') {
        const args = toolCall.args as {
          hasAllRequiredInfo: boolean
          confidence: number
          missingInfo?: string[]
        }

        // Ready to plan: high confidence + has all info
        if (args.hasAllRequiredInfo && args.confidence > 0.8) {
          return new Command({
            goto: 'planner',
            update: { mode: 'workflow' }  // Update state to workflow mode
          })
        }

        // Not ready: continue gathering requirements
        return new Command({
          goto: 'enrichment',
          update: { mode: 'chat' }  // Keep in chat mode
        })
      }
    }
  }

  // No tool calls yet (initial state or pure conversation)
  // Route to enrichment to start gathering requirements
  return new Command({
    goto: 'enrichment',
    update: { mode: 'chat' }
  })
}

