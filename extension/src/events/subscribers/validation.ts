/**
 * Validation Subscriber (Development-Only)
 *
 * Validates event sequences and agent coordination during development.
 * Catches bugs like:
 * - Agents going directly to END instead of orchestrator
 * - Duplicate agent starts without completion
 * - Invalid event sequences
 * - Performance regressions (>30s workflow creation)
 *
 * **Performance**: <1ms overhead per event
 * **Context**: Background worker only (development mode)
 * **Production**: Stripped from build (import.meta.env.DEV check)
 */

import { systemEvents } from '@events/event-bus'
import {
  validateEventSequence,
  validateGraphHandoffs,
  validateNoDuplicateStarts,
  validateCreationPerformance,
  workflowCreationContract
} from '@events/validation'

let initialized = false

/**
 * Initialize development-only event validation
 *
 * Validates event sequences and coordination patterns.
 * Only runs in development mode (import.meta.env.DEV).
 */
export function setup(): void
{
  if (!import.meta.env.DEV) return
  if (initialized) return

  // Validate workflow creation sequence
  systemEvents.agent$.pipe(
    validateEventSequence(workflowCreationContract)
  ).subscribe()

  // Validate graph handoffs (catch agent → END bugs)
  systemEvents.graph$.pipe(
    validateGraphHandoffs()
  ).subscribe()

  // Validate no duplicate agent starts
  systemEvents.agent$.pipe(
    validateNoDuplicateStarts()
  ).subscribe()

  // Validate workflow creation performance (<30s)
  systemEvents.eventStream.pipe(
    validateCreationPerformance(30000)
  ).subscribe()

  initialized = true
  console.info('[Validation] Event validation initialized (development mode)')
}

/**
 * Cleanup validation subscriptions
 * (Not strictly needed since subscriptions cleanup with systemEvents.destroy())
 */
export function cleanup(): void
{
  // Subscriptions are cleaned up by systemEvents.destroy()
  initialized = false
}
