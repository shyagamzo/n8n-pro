/**
 * Timeout utilities for preventing infinite hangs
 *
 * Provides infrastructure-level timeout handling for async operations.
 */

/**
 * Wraps a promise with a timeout
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operation - Description of operation (for error message)
 * @returns Promise that rejects if timeout exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T>
{
  let timeoutId: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) =>
{
    timeoutId = setTimeout(() =>
{
      reject(new Error(`Operation timed out after ${timeoutMs}ms: ${operation}`))
    }, timeoutMs)
  })

  try
{
    return await Promise.race([promise, timeoutPromise])
  }
 finally
{
    if (timeoutId !== undefined)
{
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Standard timeout values for common operations
 */
export const TIMEOUTS = {
  EXECUTOR: 60_000,      // 60s - Workflow creation in n8n
  PLANNER: 30_000,       // 30s - Plan generation
  VALIDATOR: 20_000,     // 20s - Plan validation
  ENRICHMENT: 15_000,    // 15s - Requirement gathering
  API_CALL: 10_000       // 10s - Single API call
} as const
