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
  // Find the most recent AI message with tool calls
  // (ReAct agents append ToolMessages after AIMessages, so last message might be a ToolMessage)
  let lastAIMessageWithTools: any = null
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i] as any
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      lastAIMessageWithTools = msg
      break
    }
  }

  // Check if enrichment called reportRequirementsStatus tool
  if (lastAIMessageWithTools) {
    for (const toolCall of lastAIMessageWithTools.tool_calls) {
      if (toolCall.name === 'reportRequirementsStatus') {
        const args = toolCall.args as {
          hasAllRequiredInfo: boolean
          confidence: number
          missingInfo?: string[]
        }

        console.log('[orchestrator] reportRequirementsStatus:', args)

        // Ready to plan: high confidence + has all info
        if (args.hasAllRequiredInfo && args.confidence > 0.8) {
          console.log('[orchestrator] Routing to planner (ready)')
          return new Command({
            goto: 'planner',
            update: { mode: 'workflow' }  // Update state to workflow mode
          })
        }

        // Not ready: continue gathering requirements
        console.log('[orchestrator] Routing back to enrichment (not ready)')
        return new Command({
          goto: 'enrichment',
          update: { mode: 'chat' }  // Keep in chat mode
        })
      }
    }
  }

  // No tool calls yet (initial state or pure conversation)
  // Route to enrichment to start gathering requirements
  console.log('[orchestrator] No tool calls found, routing to enrichment (initial)')
  return new Command({
    goto: 'enrichment',
    update: { mode: 'chat' }
  })
}

