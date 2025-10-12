/**
 * Orchestrator Node - Pure Routing Function
 *
 * Analyzes conversation state and routes to appropriate agent.
 * No LLM calls - just reads state and makes deterministic routing decisions.
 *
 * Routing Rules:
 * - If no requirements status yet → enrichment (initial state)
 * - If requirements complete (hasAllRequiredInfo=true, confidence>0.8) → planner
 * - If requirements incomplete → enrichment (gather more info)
 *
 * State-Driven Design:
 * The enrichment agent updates state.requirementsStatus when it calls reportRequirementsStatus.
 * The orchestrator simply reads this state field instead of parsing through messages.
 */

import { Command } from '@langchain/langgraph'
import type { OrchestratorStateType } from '../state'
import type { RunnableConfig } from '@langchain/core/runnables'
import { emitAgentHandoff, emitSystemDebug } from '../../events/emitters'

// ==========================================
// Constants
// ==========================================

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
 * Check if requirements are complete and confidence is high enough
 */
function isReadyForPlanning(
  hasAllRequiredInfo: boolean,
  confidence: number
): boolean
{
  return hasAllRequiredInfo && confidence > ROUTING_THRESHOLDS.CONFIDENCE_MIN
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
 * This is a pure routing function that reads the shared state
 * and decides which agent should handle the next step.
 *
 * Design: State-driven, not message-driven
 * - Enrichment agent updates state.requirementsStatus via tool calls
 * - Orchestrator simply reads state.requirementsStatus
 * - No message parsing required
 *
 * @param state - Current orchestrator state
 * @param _config - Runnable config (unused)
 * @returns Command with routing decision
 */
export function orchestratorNode(
  state: OrchestratorStateType,
  _config?: RunnableConfig
): Command
{
  const { requirementsStatus } = state

  // No requirements status yet - initial state
  if (!requirementsStatus)
  {
    emitSystemDebug(
      'orchestrator',
      'No requirements status, routing to enrichment',
      { messageCount: state.messages.length }
    )

    return routeToEnrichmentInitial(state.messages.length)
  }

  // Log the status for debugging
  emitSystemDebug('orchestrator', 'Requirements status available', {
    hasAllRequiredInfo: requirementsStatus.hasAllRequiredInfo,
    confidence: requirementsStatus.confidence,
    missingInfo: requirementsStatus.missingInfo
  })

  // Make routing decision based on readiness
  if (isReadyForPlanning(requirementsStatus.hasAllRequiredInfo, requirementsStatus.confidence))
  {
    return routeToPlanner(requirementsStatus.confidence)
  }

  return routeToEnrichment(requirementsStatus.confidence)
}

