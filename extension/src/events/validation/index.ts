/**
 * Event Validation System
 *
 * Barrel export for event validation contracts and RxJS operators.
 * Development-only feature to catch agent coordination bugs early.
 *
 * @example
 * ```typescript
 * import {
 *   validateEventSequence,
 *   validateGraphHandoffs,
 *   workflowCreationContract
 * } from '@events/validation'
 *
 * // In events/index.ts (development mode only)
 * if (process.env.NODE_ENV === 'development') {
 *   systemEvents.agent$.pipe(
 *     validateEventSequence(workflowCreationContract)
 *   ).subscribe()
 * }
 * ```
 */

// Contracts
export type {
  ExpectedEvent,
  EventSequenceContract,
  ValidationResult
} from './event-contracts'

export {
  workflowCreationContract,
  graphHandoffContract,
  matchesExpected,
  validateSequence
} from './event-contracts'

// Operators
export {
  validateEventSequence,
  validateGraphHandoffs,
  validateNoDuplicateStarts,
  validateCreationPerformance
} from './operators'
