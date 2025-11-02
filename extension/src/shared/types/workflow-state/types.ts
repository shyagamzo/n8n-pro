/**
 * Workflow Creation State Machine - Type Definitions
 *
 * Explicit state tracking for workflow creation lifecycle.
 * Replaces implicit pendingPlan flag with clear state transitions.
 *
 * **Context**: Used in content script (UI side) via Zustand chatStore
 *
 * **Pattern**: Type-safe state machine with validated transitions
 *
 * @example
 * ```typescript
 * import { isValidTransition, VALID_TRANSITIONS } from './types'
 *
 * // Check if transition is allowed
 * if (isValidTransition('idle', 'enrichment')) {
 *   // Proceed with transition
 * }
 * ```
 */

import type { Plan } from '@shared/types/plan'

// ─────────────────────────────────────────────────────────────
// State Types
// ─────────────────────────────────────────────────────────────

/**
 * Workflow creation lifecycle states
 *
 * Each state represents a distinct phase in the workflow creation process:
 * - `idle`: No active workflow
 * - `enrichment`: Gathering requirements from user
 * - `planning`: Creating workflow plan
 * - `awaiting_approval`: Plan ready, waiting for user approval
 * - `executing`: Creating workflow in n8n
 * - `completed`: Workflow created successfully
 * - `failed`: Workflow creation failed
 */
export type WorkflowState =
  | 'idle'
  | 'enrichment'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'completed'
  | 'failed'

/**
 * Allowed state transitions with their triggers
 *
 * Documents the valid state transitions and what events cause them.
 * Used for documentation and type-checking purposes.
 */
export type WorkflowStateTransition =
  | { from: 'idle'; to: 'enrichment'; trigger: 'user_message' }
  | { from: 'enrichment'; to: 'planning'; trigger: 'requirements_complete' }
  | { from: 'planning'; to: 'awaiting_approval'; trigger: 'plan_generated' }
  | { from: 'awaiting_approval'; to: 'executing'; trigger: 'user_approval' }
  | { from: 'awaiting_approval'; to: 'planning'; trigger: 'user_modification' }
  | { from: 'executing'; to: 'completed'; trigger: 'workflow_created' }
  | { from: 'executing'; to: 'failed'; trigger: 'creation_error' }
  | { from: 'completed' | 'failed'; to: 'idle'; trigger: 'new_conversation' }
  | { from: 'enrichment' | 'planning' | 'awaiting_approval'; to: 'idle'; trigger: 'reset' }

/**
 * Complete workflow state data
 *
 * Contains current state plus state-specific data (plan, workflowId, error).
 * Also includes transition history for debugging.
 */
export type WorkflowStateData = {
  /**
   * Current state in the workflow lifecycle
   */
  state: WorkflowState

  /**
   * Workflow plan (only present in awaiting_approval, executing, completed states)
   */
  plan?: Plan

  /**
   * Created workflow ID (only present in completed state)
   */
  workflowId?: string

  /**
   * Error details (only present in failed state)
   */
  error?: {
    message: string
    retryable: boolean
  }

  /**
   * Timestamp of last state transition (milliseconds since epoch)
   */
  lastTransitionAt: number

  /**
   * History of state transitions for debugging
   *
   * Limited to last 20 transitions to prevent memory bloat
   */
  transitionHistory: Array<{
    from: WorkflowState
    to: WorkflowState
    trigger: string
    timestamp: number
  }>
}

// ─────────────────────────────────────────────────────────────
// Valid Transitions Map
// ─────────────────────────────────────────────────────────────

/**
 * Valid state transitions map
 *
 * Defines which states can transition to which other states.
 * Used for runtime validation in the transition function.
 *
 * **Design Principle**: Fail fast on invalid transitions to catch bugs early
 */
export const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  idle: ['enrichment'],
  enrichment: ['planning', 'idle'], // Can reset
  planning: ['awaiting_approval', 'failed', 'idle'],
  awaiting_approval: ['executing', 'planning', 'idle'],
  executing: ['completed', 'failed'],
  completed: ['idle'],
  failed: ['idle']
}

// ─────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────

/**
 * Check if state transition is valid
 *
 * @param from - Current state
 * @param to - Target state
 * @returns `true` if transition is allowed
 *
 * @example
 * ```typescript
 * if (isValidTransition('idle', 'enrichment')) {
 *   // OK: Can start enrichment from idle
 * }
 *
 * if (!isValidTransition('idle', 'executing')) {
 *   // ERROR: Cannot go directly from idle to executing
 * }
 * ```
 */
export function isValidTransition(from: WorkflowState, to: WorkflowState): boolean
{
  return VALID_TRANSITIONS[from].includes(to)
}

/**
 * Check if state is in "working" phase
 *
 * Working states indicate the system is actively processing (not waiting for user).
 *
 * @param state - State to check
 * @returns `true` if state represents active work
 *
 * @example
 * ```typescript
 * if (isWorkingState('enrichment')) {
 *   // Show loading spinner
 * }
 * ```
 */
export function isWorkingState(state: WorkflowState): boolean
{
  return ['enrichment', 'planning', 'executing'].includes(state)
}

/**
 * Check if state is terminal
 *
 * Terminal states indicate workflow creation has finished (successfully or not).
 *
 * @param state - State to check
 * @returns `true` if state is completed or failed
 *
 * @example
 * ```typescript
 * if (isTerminalState('completed')) {
 *   // Hide progress stepper
 * }
 * ```
 */
export function isTerminalState(state: WorkflowState): boolean
{
  return ['completed', 'failed'].includes(state)
}

/**
 * Check if user can interact in this state
 *
 * Interactive states allow user input (sending messages, clicking buttons).
 * Working states typically block user interaction.
 *
 * @param state - State to check
 * @returns `true` if user can interact
 *
 * @example
 * ```typescript
 * if (!canUserInteract('executing')) {
 *   // Disable input field
 * }
 * ```
 */
export function canUserInteract(state: WorkflowState): boolean
{
  return ['idle', 'awaiting_approval', 'completed', 'failed'].includes(state)
}
