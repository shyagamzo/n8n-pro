/**
 * Workflow State Machine Implementation
 *
 * Pure functions for state transitions with validation.
 * All transitions are atomic and throw errors on invalid state changes.
 *
 * **Context**: Used in content script (UI side) via Zustand chatStore
 *
 * **Pattern**: Pure functions returning new state (immutable updates)
 *
 * @example
 * ```typescript
 * import { createInitialState, startEnrichment } from './machine'
 *
 * const state = createInitialState()
 * const nextState = startEnrichment(state)
 * // state.state === 'idle'
 * // nextState.state === 'enrichment'
 * ```
 */

import type { WorkflowStateData, WorkflowState } from './types'
import { isValidTransition, VALID_TRANSITIONS } from './types'
import type { Plan } from '@shared/types/plan'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/**
 * Maximum transition history to keep (prevent memory bloat)
 */
const MAX_TRANSITION_HISTORY = 20

// ─────────────────────────────────────────────────────────────
// Core State Machine Functions
// ─────────────────────────────────────────────────────────────

/**
 * Create initial workflow state
 *
 * Returns a fresh state machine in idle state with empty history.
 *
 * @returns Initial workflow state data
 *
 * @example
 * ```typescript
 * const initialState = createInitialState()
 * // { state: 'idle', lastTransitionAt: 1699564800000, transitionHistory: [] }
 * ```
 */
export function createInitialState(): WorkflowStateData
{
  return {
    state: 'idle',
    lastTransitionAt: Date.now(),
    transitionHistory: []
  }
}

/**
 * Transition to a new state
 *
 * Core transition function that validates state changes and records history.
 * Throws error if transition is invalid.
 *
 * @param current - Current state data
 * @param to - Target state
 * @param trigger - Event that triggered this transition
 * @param data - Additional state-specific data to merge
 * @returns New state data (immutable update)
 * @throws Error if transition is invalid
 *
 * @example
 * ```typescript
 * const current = createInitialState()
 * const next = transition(current, 'enrichment', 'user_message')
 * // Valid transition: idle → enrichment
 *
 * transition(current, 'executing', 'invalid')
 * // Throws: Invalid workflow state transition: idle -> executing
 * ```
 */
export function transition(
  current: WorkflowStateData,
  to: WorkflowState,
  trigger: string,
  data?: Partial<WorkflowStateData>
): WorkflowStateData
{
  const from = current.state

  // Validate transition
  if (!isValidTransition(from, to))
  {
    throw new Error(
      `Invalid workflow state transition: ${from} -> ${to}. ` +
      `Valid transitions from ${from}: ${VALID_TRANSITIONS[from].join(', ')}`
    )
  }

  // Create transition record
  const transitionRecord = {
    from,
    to,
    trigger,
    timestamp: Date.now()
  }

  // Build new state (immutable update)
  const newState: WorkflowStateData = {
    ...current,
    ...data,
    state: to,
    lastTransitionAt: Date.now(),
    transitionHistory: [
      ...current.transitionHistory,
      transitionRecord
    ].slice(-MAX_TRANSITION_HISTORY) // Keep only last N transitions
  }

  // Clear state-specific data on transitions to idle
  if (to === 'idle')
  {
    newState.plan = undefined
    newState.workflowId = undefined
    newState.error = undefined
  }

  return newState
}

// ─────────────────────────────────────────────────────────────
// Lifecycle Transition Functions
// ─────────────────────────────────────────────────────────────

/**
 * Transition: User sends message (idle → enrichment)
 *
 * @param current - Current state data
 * @returns New state in enrichment phase
 * @throws Error if not in idle state
 *
 * @example
 * ```typescript
 * const state = createInitialState()
 * const enriching = startEnrichment(state)
 * // enriching.state === 'enrichment'
 * ```
 */
export function startEnrichment(current: WorkflowStateData): WorkflowStateData
{
  return transition(current, 'enrichment', 'user_message')
}

/**
 * Transition: Requirements complete, start planning (enrichment → planning)
 *
 * @param current - Current state data
 * @returns New state in planning phase
 * @throws Error if not in enrichment state
 *
 * @example
 * ```typescript
 * const enriching = startEnrichment(createInitialState())
 * const planning = startPlanning(enriching)
 * // planning.state === 'planning'
 * ```
 */
export function startPlanning(current: WorkflowStateData): WorkflowStateData
{
  return transition(current, 'planning', 'requirements_complete')
}

/**
 * Transition: Plan generated, await user approval (planning → awaiting_approval)
 *
 * @param current - Current state data
 * @param plan - Generated workflow plan
 * @returns New state awaiting user approval
 * @throws Error if not in planning state
 *
 * @example
 * ```typescript
 * const planning = startPlanning(enriching)
 * const awaiting = awaitApproval(planning, generatedPlan)
 * // awaiting.state === 'awaiting_approval'
 * // awaiting.plan === generatedPlan
 * ```
 */
export function awaitApproval(current: WorkflowStateData, plan: Plan): WorkflowStateData
{
  return transition(current, 'awaiting_approval', 'plan_generated', { plan })
}

/**
 * Transition: User approves plan, start execution (awaiting_approval → executing)
 *
 * @param current - Current state data
 * @returns New state in execution phase
 * @throws Error if not in awaiting_approval state or plan is missing
 *
 * @example
 * ```typescript
 * const awaiting = awaitApproval(planning, plan)
 * const executing = startExecution(awaiting)
 * // executing.state === 'executing'
 * // executing.plan === plan (preserved)
 * ```
 */
export function startExecution(current: WorkflowStateData): WorkflowStateData
{
  if (!current.plan)
  {
    throw new Error('Cannot start execution without a plan')
  }

  return transition(current, 'executing', 'user_approval')
}

/**
 * Transition: User modifies plan, return to planning (awaiting_approval → planning)
 *
 * @param current - Current state data
 * @returns New state in planning phase for modifications
 * @throws Error if not in awaiting_approval state
 *
 * @example
 * ```typescript
 * const awaiting = awaitApproval(planning, plan)
 * const modifying = modifyPlan(awaiting)
 * // modifying.state === 'planning'
 * // modifying.plan === plan (preserved for modification)
 * ```
 */
export function modifyPlan(current: WorkflowStateData): WorkflowStateData
{
  return transition(current, 'planning', 'user_modification')
}

/**
 * Transition: Workflow created successfully (executing → completed)
 *
 * @param current - Current state data
 * @param workflowId - ID of created workflow
 * @returns New state in completed phase
 * @throws Error if not in executing state
 *
 * @example
 * ```typescript
 * const executing = startExecution(awaiting)
 * const completed = completeWorkflow(executing, 'workflow-123')
 * // completed.state === 'completed'
 * // completed.workflowId === 'workflow-123'
 * // completed.plan === plan (preserved for display)
 * ```
 */
export function completeWorkflow(
  current: WorkflowStateData,
  workflowId: string
): WorkflowStateData
{
  return transition(current, 'completed', 'workflow_created', { workflowId })
}

/**
 * Transition: Workflow creation failed (executing → failed)
 *
 * @param current - Current state data
 * @param error - Error details
 * @returns New state in failed phase
 * @throws Error if not in executing state
 *
 * @example
 * ```typescript
 * const executing = startExecution(awaiting)
 * const failed = failWorkflow(executing, {
 *   message: 'n8n API unreachable',
 *   retryable: true
 * })
 * // failed.state === 'failed'
 * // failed.error.message === 'n8n API unreachable'
 * ```
 */
export function failWorkflow(
  current: WorkflowStateData,
  error: { message: string; retryable: boolean }
): WorkflowStateData
{
  return transition(current, 'failed', 'creation_error', { error })
}

/**
 * Transition: Reset to idle (new conversation)
 *
 * Can be called from any terminal state (completed, failed) or intermediate states.
 * Clears all state-specific data.
 *
 * @param current - Current state data
 * @returns New state in idle phase
 * @throws Error if transition not allowed from current state
 *
 * @example
 * ```typescript
 * const completed = completeWorkflow(executing, 'workflow-123')
 * const idle = resetWorkflow(completed)
 * // idle.state === 'idle'
 * // idle.plan === undefined
 * // idle.workflowId === undefined
 * ```
 */
export function resetWorkflow(current: WorkflowStateData): WorkflowStateData
{
  return transition(current, 'idle', 'new_conversation')
}
