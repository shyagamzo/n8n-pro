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
import { emitAgentHandoff, emitSystemDebug } from '../../events/emitters'

// ==========================================
// Type Definitions
// ==========================================

/**
 * Arguments for reportRequirementsStatus tool call
 */
interface RequirementsStatusArgs
{
  hasAllRequiredInfo: boolean
  confidence: number
  missingInfo?: string[]
}

/**
 * Routing thresholds
 */
const ROUTING_THRESHOLDS = {
  CONFIDENCE_MIN: 0.8,  // Minimum confidence to proceed to planning
} as const

// ==========================================
// Helper Functions
// ==========================================

/**
 * Find the most recent AI message that contains tool calls
 *
 * ReAct agents append ToolMessages after AIMessages, so the last message
 * in the array might be a ToolMessage. We need to search backwards to find
 * the AIMessage that contains the tool_calls.
 */
function findLastAIMessageWithTools(messages: any[]): any | null
{
  for (let i = messages.length - 1; i >= 0; i--)
  {
    const msg = messages[i] as any

    if (msg.tool_calls && msg.tool_calls.length > 0)
    {
      return msg
    }
  }

  return null
}

/**
 * Find reportRequirementsStatus tool call in message
 */
function findRequirementsStatusToolCall(message: any): RequirementsStatusArgs | null
{
  if (!message?.tool_calls) return null

  for (const toolCall of message.tool_calls)
  {
    if (toolCall.name === 'reportRequirementsStatus')
    {
      return toolCall.args as RequirementsStatusArgs
    }
  }

  return null
}

/**
 * Check if requirements are complete and confidence is high enough
 */
function isReadyForPlanning(args: RequirementsStatusArgs): boolean
{
  return args.hasAllRequiredInfo && args.confidence > ROUTING_THRESHOLDS.CONFIDENCE_MIN
}

// ==========================================
// Routing Commands
// ==========================================

/**
 * Route to planner (requirements complete)
 */
function routeToPlanner(confidence: number): Command
{
  emitAgentHandoff(
    'enrichment',
    'planner',
    `requirements complete (confidence: ${confidence})`
  )

  return new Command({
    goto: 'planner',
    update: { mode: 'workflow' }
  })
}

/**
 * Route back to enrichment (more info needed)
 */
function routeToEnrichment(confidence: number): Command
{
  emitAgentHandoff(
    'orchestrator',
    'enrichment',
    `more info needed (confidence: ${confidence})`
  )

  return new Command({
    goto: 'enrichment',
    update: { mode: 'chat' }
  })
}

/**
 * Route to enrichment (initial state, no tool calls yet)
 */
function routeToEnrichmentInitial(messageCount: number): Command
{
  emitSystemDebug(
    'orchestrator',
    'No tool calls found, routing to enrichment',
    { messageCount }
  )

  return new Command({
    goto: 'enrichment',
    update: { mode: 'chat' }
  })
}

// ==========================================
// Main Orchestrator Node
// ==========================================

/**
 * Orchestrator node - determines next agent based on current state
 *
 * This is a pure routing function that analyzes the conversation state
 * and decides which agent should handle the next step.
 *
 * @param state - Current orchestrator state with message history
 * @param _config - Runnable config (unused)
 * @returns Command with routing decision
 */
export function orchestratorNode(
  state: OrchestratorStateType,
  _config?: RunnableConfig
): Command
{
  // Step 1: Find the most recent AI message with tool calls
  const lastAIMessageWithTools = findLastAIMessageWithTools(state.messages)

  if (!lastAIMessageWithTools)
  {
    // No tool calls yet - initial state or pure conversation
    return routeToEnrichmentInitial(state.messages.length)
  }

  // Step 2: Check for reportRequirementsStatus tool call
  const requirementsStatus = findRequirementsStatusToolCall(lastAIMessageWithTools)

  if (!requirementsStatus)
  {
    // No requirements status reported - continue with enrichment
    return routeToEnrichmentInitial(state.messages.length)
  }

  // Step 3: Log the status for debugging
  emitSystemDebug('orchestrator', 'reportRequirementsStatus received', {
    hasAllRequiredInfo: requirementsStatus.hasAllRequiredInfo,
    confidence: requirementsStatus.confidence,
    missingInfo: requirementsStatus.missingInfo
  })

  // Step 4: Make routing decision based on readiness
  if (isReadyForPlanning(requirementsStatus))
  {
    return routeToPlanner(requirementsStatus.confidence)
  }

  return routeToEnrichment(requirementsStatus.confidence)
}

