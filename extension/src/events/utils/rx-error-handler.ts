/**
 * RxJS Error Handling Utilities
 *
 * Reusable error handling operators for event streams.
 * Prevents stream termination on errors.
 */

import { EMPTY, type OperatorFunction } from 'rxjs'
import { catchError } from 'rxjs/operators'

/**
 * Log error and continue stream (don't break on errors)
 *
 * Standard error handler for event validation and processing streams.
 * Logs error to console but continues stream emission.
 *
 * @param context - Context string for error logging (e.g., "Validation", "Logger")
 * @returns RxJS operator that catches errors and continues
 *
 * @example
 * ```typescript
 * systemEvents.agent$.pipe(
 *   validateEventSequence(contract),
 *   logAndContinue('Validation')
 * ).subscribe()
 * ```
 */
export function logAndContinue<T>(context: string): OperatorFunction<T, T>
{
  return catchError(err =>
  {
    console.error(`[${context}] Stream error:`, err)
    return EMPTY // Don't break the stream
  })
}

/**
 * Log error with additional metadata and continue stream
 *
 * @param context - Context string for error logging
 * @param metadata - Additional metadata to log
 * @returns RxJS operator that catches errors and continues
 *
 * @example
 * ```typescript
 * systemEvents.agent$.pipe(
 *   validateEventSequence(contract),
 *   logWithMetadataAndContinue('Validation', { contract: contract.name })
 * ).subscribe()
 * ```
 */
export function logWithMetadataAndContinue<T>(
  context: string,
  metadata?: Record<string, unknown>
): OperatorFunction<T, T>
{
  return catchError(err =>
  {
    console.error(`[${context}] Stream error:`, err, metadata)
    return EMPTY
  })
}
