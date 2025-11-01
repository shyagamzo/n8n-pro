/**
 * Orchestrator Node - Pure Routing Function
 *
 * Explicit state machine that routes based on currentStep.
 * No LLM calls - just looks up next step from flow map.
 *
 * Design:
 * - Orchestrator sets currentStep when routing (owns state transitions)
 * - Orchestrator uses step flow map to determine next destination
 * - stepHistory tracks the exact path taken
 *
 * Benefits:
 * - Single source of truth for state transitions
 * - Simple, declarative routing
 * - Easy to debug (just check stepHistory)
 * - Self-documenting flow
 */

// ==========================================
// Imports
// ==========================================

import { Command, END } from '@langchain/langgraph'

import type { OrchestratorStateType } from '@ai/orchestrator/state'
import type { Step } from '@events/types'
import { emitGraphHandoff } from '@events/emitters'

// ==========================================
// Constants
// ==========================================

const CONFIDENCE_THRESHOLD = 0.8
const MAX_VALIDATION_RETRIES = 3 // Prevent infinite validation loops

// ==========================================
// Type Definitions
// ==========================================

type NextStepFn = (state: OrchestratorStateType) => Step | typeof END

/**
 * Step flow map - declarative routing logic
 *
 * Each step defines a function that determines the next step based on state.
 * This makes the flow explicit and easy to understand.
 *
 * Note: Executor is NOT in this map because it's a terminal node that
 * goes directly to END (never returns to orchestrator).
 */
const Steps: Record<Exclude<Step, 'executor'>, NextStepFn> = {
  // Enrichment: loop until requirements are complete
  enrichment: (state) =>
  {
    const { requirementsStatus } = state
    const isReady = requirementsStatus?.hasAllRequiredInfo && requirementsStatus.confidence > CONFIDENCE_THRESHOLD
    return isReady ? 'planner' : 'enrichment'
  },

  // Planner always goes to validator
  planner: () => 'validator',

  // Validator: handle fixes if needed, then go to executor
  // But prevent infinite loops by limiting retries
  validator: (state) =>
  {
    if (state.validationStatus?.valid)
    {
      return 'executor'
    }

    // Count how many times we've gone validator -> planner
    const validationRetries = state.stepHistory.filter(
      (step, i, arr) => step === 'validator' && arr[i + 1] === 'planner'
    ).length

    if (validationRetries >= MAX_VALIDATION_RETRIES)
    {
      // Too many retries - proceed to executor anyway
      // The n8n API will catch any actual errors
      return 'executor'
    }

    return 'planner'
  }
} as const


// ==========================================
// Main Orchestrator Node
// ==========================================

/**
 * Orchestrator node - explicit state machine routing
 *
 * Owns all state transitions:
 * - Sets currentStep when routing to next node
 * - Tracks stepHistory for debugging
 * - Emits handoff events for observability
 *
 * @param state - Current orchestrator state
 * @returns Command with routing decision
 */
export function orchestratorNode(
  state: OrchestratorStateType
): Command
{
  const currentStep = state.currentStep || 'enrichment'

  // Executor is a terminal node - if we receive it here, route to END
  // This handles legacy checkpoint state from before the graph refactor
  if (currentStep === 'executor')
  {
    return new Command({
      goto: END,
      update: {}
    })
  }

  const nextStep = Steps[currentStep](state)

  // Emit handoff event for observability
  if (currentStep !== nextStep)
  {
    emitGraphHandoff(currentStep, nextStep, `${currentStep} → ${nextStep}`)
  }

  // Record step in history
  const updates: Partial<OrchestratorStateType> = {
    stepHistory: [currentStep]
  }

  // Only update currentStep if routing to an actual node (not END)
  if (nextStep !== END)
  {
    updates.currentStep = nextStep as Step
  }

  // Route to next step
  return new Command({
    goto: nextStep,
    update: updates
  })
}

