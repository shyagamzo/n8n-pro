/**
 * Workflow State Machine
 *
 * Barrel export for workflow state machine types and functions.
 *
 * @example
 * ```typescript
 * import {
 *   createInitialState,
 *   startEnrichment,
 *   awaitApproval,
 *   isWorkingState
 * } from '@shared/types/workflow-state'
 * ```
 */

// Type definitions
export type {
  WorkflowState,
  WorkflowStateTransition,
  WorkflowStateData
} from './types'

export {
  VALID_TRANSITIONS,
  isValidTransition,
  isWorkingState,
  isTerminalState,
  canUserInteract
} from './types'

// State machine functions
export {
  createInitialState,
  transition,
  startEnrichment,
  startPlanning,
  awaitApproval,
  startExecution,
  modifyPlan,
  completeWorkflow,
  failWorkflow,
  resetWorkflow
} from './machine'
