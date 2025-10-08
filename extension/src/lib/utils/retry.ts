/**
 * Retry utilities with exponential backoff.
 * Provides configurable retry logic for API calls and other operations.
 */

import { logger } from '../services/logger'

export type RetryOptions = {
  /**
   * Maximum number of retry attempts.
   * @default 3
   */
  maxAttempts?: number

  /**
   * Initial delay in milliseconds before first retry.
   * @default 1000
   */
  initialDelayMs?: number

  /**
   * Maximum delay in milliseconds between retries.
   * @default 10000
   */
  maxDelayMs?: number

  /**
   * Multiplier for exponential backoff.
   * @default 2
   */
  backoffMultiplier?: number

  /**
   * Function to determine if error should be retried.
   * @default Always retry
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean

  /**
   * Called before each retry attempt.
   */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
  onRetry: () => {},
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void>
{
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay for exponential backoff with jitter.
 * Adds random jitter to prevent thundering herd.
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number
{
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs)

  // Add jitter: random value between 0.8 and 1.2 of calculated delay
  const jitter = 0.8 + Math.random() * 0.4
  return Math.floor(cappedDelay * jitter)
}

/**
 * Retry an async operation with exponential backoff.
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await api.call(),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T>
{
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++)
  {
    try
    {
      return await operation()
    }
    catch (error)
    {
      lastError = error

      // Check if we should retry
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(error, attempt))
      {
        logger.error(`Operation failed after ${attempt} attempt(s)`, error as Error, {
          attempt,
          maxAttempts: opts.maxAttempts,
        })
        throw error
      }

      // Calculate delay and retry
      const delayMs = calculateDelay(attempt, opts)

      logger.warn(`Operation failed, retrying in ${delayMs}ms`, {
        attempt,
        maxAttempts: opts.maxAttempts,
        delayMs,
        error: error instanceof Error ? error.message : String(error),
      })

      opts.onRetry(error, attempt, delayMs)
      await sleep(delayMs)
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError
}

/**
 * Check if error indicates a retryable API failure.
 */
export function isRetryableError(error: unknown): boolean
{
  // Check for ApiError with isRetryable method
  if (error && typeof error === 'object' && 'isRetryable' in error)
  {
    const apiError = error as { isRetryable: () => boolean }
    if (typeof apiError.isRetryable === 'function')
    {
      return apiError.isRetryable()
    }
  }

  // Check for specific error types
  if (error instanceof Error)
  {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('econnreset'))
    {
      return true
    }

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('too many requests'))
    {
      return true
    }
  }

  return false
}

/**
 * Retry options for API calls with sensible defaults.
 */
export const API_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: isRetryableError,
}
