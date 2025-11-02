/**
 * Error normalization utilities
 *
 * Provides consistent error handling by normalizing unknown errors to Error objects.
 * This ensures all error handling code can safely access Error properties and methods.
 */

/**
 * Normalizes unknown errors to Error objects
 *
 * Handles multiple error types:
 * - Error instances: returned as-is
 * - Objects with message property: converted to Error with that message
 * - All other types: converted to Error with string representation
 *
 * @param error - Unknown error value (could be Error, string, object, etc.)
 * @returns Normalized Error object
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   const err = normalizeError(error)
 *   console.error(err.message) // Safe to access
 * }
 * ```
 */
export function normalizeError(error: unknown): Error
{
  // Already an Error - return as-is
  if (error instanceof Error)
  {
    return error
  }

  // Object with message property - preserve message
  if (typeof error === 'object' && error !== null && 'message' in error)
  {
    const message = typeof error.message === 'string' ? error.message : String(error)
    return new Error(message)
  }

  // Everything else - convert to string
  return new Error(String(error))
}
