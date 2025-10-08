/**
 * Retry logic with exponential backoff for transient failures
 */

export type RetryOptions = {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Function to determine if error is retryable (default: checks for network/timeout errors) */
  isRetryable?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
  isRetryable: defaultIsRetryable,
}

/**
 * Default retryable error checker
 * Retries on: network errors, timeouts, 429 (rate limit), 502/503/504 (server errors)
 * Does not retry on: 4xx client errors (except 429), authentication errors
 */
function defaultIsRetryable(error: unknown): boolean
{
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch'))
  {
    return true
  }

  // DOMException for timeout
  if (error instanceof DOMException && error.name === 'AbortError')
  {
    return true
  }

  // Check for HTTP status codes
  if (error && typeof error === 'object' && 'status' in error)
  {
    const status = (error as { status: number }).status
    
    // Retry on rate limit
    if (status === 429) return true
    
    // Retry on server errors
    if (status >= 502 && status <= 504) return true
    
    // Don't retry on client errors or auth errors
    if (status >= 400 && status < 500) return false
  }

  // Default: don't retry unknown errors
  return false
}

/**
 * Calculate delay for next retry attempt using exponential backoff
 */
function calculateDelay(
  attemptNumber: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number
{
  const delay = initialDelay * Math.pow(multiplier, attemptNumber)
  return Math.min(delay, maxDelay)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void>
{
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 * 
 * @example
 * ```ts
 * const result = await retry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * )
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T>
{
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++)
  {
    try
    {
      return await fn()
    }
    catch (error)
    {
      lastError = error

      // Don't retry if this is the last attempt
      if (attempt === opts.maxRetries)
      {
        break
      }

      // Check if error is retryable
      if (!opts.isRetryable(error))
      {
        throw error
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      )

      // Log retry attempt in development
      if (process.env.NODE_ENV === 'development')
      {
        console.warn(
          `Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`,
          error
        )
      }

      await sleep(delay)
    }
  }

  // All retries exhausted, throw the last error
  throw lastError
}

/**
 * Create a retryable version of a function
 * 
 * @example
 * ```ts
 * const fetchWithRetry = retryable(
 *   (url: string) => fetch(url).then(r => r.json()),
 *   { maxRetries: 3 }
 * )
 * 
 * const data = await fetchWithRetry('https://api.example.com/data')
 * ```
 */
export function retryable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult>
{
  return (...args: TArgs) => retry(() => fn(...args), options)
}
