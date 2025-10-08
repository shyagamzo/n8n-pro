/**
 * Rate limiting utilities to prevent API abuse and throttle requests.
 * Implements token bucket algorithm for smooth rate limiting.
 */

import { logger } from '../services/logger'

/**
 * Token bucket rate limiter configuration.
 */
export type RateLimiterConfig = {
  /**
   * Maximum number of tokens (requests) in the bucket.
   */
  maxTokens: number

  /**
   * Rate at which tokens refill (tokens per second).
   */
  refillRate: number

  /**
   * Initial number of tokens in the bucket.
   * @default maxTokens
   */
  initialTokens?: number
}

/**
 * Token bucket rate limiter.
 * Allows burst traffic up to maxTokens, then enforces steady rate.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({ maxTokens: 10, refillRate: 2 });
 * await limiter.acquire(); // Wait for token availability
 * await api.call();
 * ```
 */
export class RateLimiter
{
  private tokens: number
  private lastRefillTime: number
  private readonly config: Required<RateLimiterConfig>
  private waitQueue: Array<{ resolve: () => void; timestamp: number }> = []

  constructor(config: RateLimiterConfig)
  {
    this.config = {
      ...config,
      initialTokens: config.initialTokens ?? config.maxTokens,
    }
    this.tokens = this.config.initialTokens
    this.lastRefillTime = Date.now()
  }

  /**
   * Refill tokens based on elapsed time.
   */
  private refill(): void
  {
    const now = Date.now()
    const elapsedMs = now - this.lastRefillTime
    const elapsedSeconds = elapsedMs / 1000

    // Calculate tokens to add based on elapsed time
    const tokensToAdd = elapsedSeconds * this.config.refillRate
    this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd)
    this.lastRefillTime = now
  }

  /**
   * Acquire a token, waiting if necessary.
   * Returns immediately if tokens are available, otherwise waits.
   */
  public async acquire(): Promise<void>
  {
    this.refill()

    if (this.tokens >= 1)
    {
      this.tokens -= 1
      return
    }

    // Calculate wait time until next token is available
    const tokensNeeded = 1 - this.tokens
    const waitTimeMs = (tokensNeeded / this.config.refillRate) * 1000

    logger.debug('Rate limit reached, waiting for token', {
      waitTimeMs: Math.ceil(waitTimeMs),
      currentTokens: this.tokens,
      maxTokens: this.config.maxTokens,
    })

    return new Promise<void>((resolve) =>
    {
      const timeoutId = setTimeout(() =>
      {
        this.refill()
        this.tokens -= 1
        resolve()
      }, waitTimeMs)

      // Track waiting requests for debugging
      this.waitQueue.push({
        resolve: () => clearTimeout(timeoutId),
        timestamp: Date.now(),
      })
    })
  }

  /**
   * Try to acquire a token without waiting.
   * Returns true if token was acquired, false otherwise.
   */
  public tryAcquire(): boolean
  {
    this.refill()

    if (this.tokens >= 1)
    {
      this.tokens -= 1
      return true
    }

    return false
  }

  /**
   * Get current token count.
   */
  public getTokens(): number
  {
    this.refill()
    return this.tokens
  }

  /**
   * Get number of waiting requests.
   */
  public getWaitingCount(): number
  {
    return this.waitQueue.length
  }

  /**
   * Reset the rate limiter to initial state.
   */
  public reset(): void
  {
    this.tokens = this.config.initialTokens
    this.lastRefillTime = Date.now()
    this.waitQueue = []
  }
}

/**
 * Pre-configured rate limiters for common use cases.
 */
export const RateLimiters = {
  /**
   * OpenAI API rate limiter.
   * Conservative limits to avoid hitting API quotas.
   */
  openai: new RateLimiter({
    maxTokens: 10, // Allow burst of 10 requests
    refillRate: 2, // 2 requests per second steady state
  }),

  /**
   * n8n API rate limiter.
   * More lenient since it's a local/self-hosted instance.
   */
  n8n: new RateLimiter({
    maxTokens: 20, // Allow burst of 20 requests
    refillRate: 5, // 5 requests per second steady state
  }),
}

/**
 * Execute an operation with rate limiting.
 *
 * @example
 * ```typescript
 * const result = await withRateLimit(
 *   RateLimiters.openai,
 *   async () => await openai.chat.completions.create(...)
 * );
 * ```
 */
export async function withRateLimit<T>(limiter: RateLimiter, operation: () => Promise<T>): Promise<T>
{
  await limiter.acquire()
  return await operation()
}
