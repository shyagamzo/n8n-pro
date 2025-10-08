/**
 * Performance monitoring and optimization utilities.
 * Helps track and prevent performance issues in the extension.
 */

import { logger } from '../services/logger'

/**
 * Measure execution time of an async operation.
 * 
 * @example
 * ```typescript
 * const result = await measurePerformance('API Call', async () => {
 *   return await api.call()
 * })
 * ```
 */
export async function measurePerformance<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T>
{
  const start = performance.now()

  try
  {
    const result = await operation()
    const duration = performance.now() - start

    logger.debug(`Performance: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
      name,
    })

    // Warn if operation takes too long
    if (duration > 5000)
    {
      logger.warn(`Slow operation: ${name}`, {
        duration: `${duration.toFixed(2)}ms`,
        threshold: '5000ms',
      })
    }

    return result
  }
  catch (error)
  {
    const duration = performance.now() - start
    logger.error(`Performance: ${name} failed`, error as Error, {
      duration: `${duration.toFixed(2)}ms`,
    })
    throw error
  }
}

/**
 * Debounce function to limit execution rate.
 * Useful for input handlers and scroll events.
 * 
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   performSearch(query)
 * }, 300)
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void
{
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function debounced(...args: Parameters<T>): void
  {
    if (timeoutId !== null)
    {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() =>
    {
      func(...args)
      timeoutId = null
    }, waitMs)
  }
}

/**
 * Throttle function to limit execution frequency.
 * Ensures function is called at most once per time period.
 * 
 * @example
 * ```typescript
 * const throttledScroll = throttle(() => {
 *   handleScroll()
 * }, 100)
 * ```
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void
{
  let lastCallTime = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function throttled(...args: Parameters<T>): void
  {
    const now = Date.now()
    const timeSinceLastCall = now - lastCallTime

    if (timeSinceLastCall >= waitMs)
    {
      lastCallTime = now
      func(...args)
    }
    else if (timeoutId === null)
    {
      // Schedule next call after remaining time
      timeoutId = setTimeout(() =>
      {
        lastCallTime = Date.now()
        func(...args)
        timeoutId = null
      }, waitMs - timeSinceLastCall)
    }
  }
}

/**
 * Create a cleanup handler to prevent memory leaks.
 * Returns a cleanup function that can be called multiple times safely.
 * 
 * @example
 * ```typescript
 * const cleanup = createCleanup()
 * 
 * const port = chrome.runtime.connect()
 * cleanup.add(() => port.disconnect())
 * 
 * const timer = setInterval(() => {}, 1000)
 * cleanup.add(() => clearInterval(timer))
 * 
 * // Later: clean up all resources
 * cleanup.execute()
 * ```
 */
export function createCleanup(): {
  add: (fn: () => void) => void
  execute: () => void
  readonly size: number
}
{
  const cleanupFns: Array<() => void> = []
  let executed = false

  return {
    add(fn: () => void): void
    {
      if (!executed)
      {
        cleanupFns.push(fn)
      }
      else
      {
        logger.warn('Attempted to add cleanup after execution')
      }
    },

    execute(): void
    {
      if (executed)
      {
        logger.warn('Cleanup already executed')
        return
      }

      executed = true

      for (const fn of cleanupFns)
      {
        try
        {
          fn()
        }
        catch (error)
        {
          logger.error('Cleanup function failed', error as Error)
        }
      }

      cleanupFns.length = 0
    },

    get size(): number
    {
      return cleanupFns.length
    },
  }
}

/**
 * Batch multiple operations to reduce overhead.
 * Collects items and processes them in batches.
 * 
 * @example
 * ```typescript
 * const batcher = createBatcher<string>(
 *   async (items) => {
 *     await api.sendBatch(items)
 *   },
 *   { maxSize: 10, maxWaitMs: 1000 }
 * )
 * 
 * batcher.add('item1')
 * batcher.add('item2')
 * // Automatically flushes when batch is full or time limit reached
 * ```
 */
export function createBatcher<T>(
  processBatch: (items: T[]) => Promise<void>,
  options: {
    maxSize?: number
    maxWaitMs?: number
  } = {}
): {
  add: (item: T) => void
  flush: () => Promise<void>
  readonly size: number
}
{
  const maxSize = options.maxSize ?? 10
  const maxWaitMs = options.maxWaitMs ?? 1000

  let batch: T[] = []
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let processing = false

  async function flush(): Promise<void>
  {
    if (processing || batch.length === 0) return

    processing = true

    if (timeoutId !== null)
    {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    const itemsToProcess = [...batch]
    batch = []

    try
    {
      await processBatch(itemsToProcess)
    }
    catch (error)
    {
      logger.error('Batch processing failed', error as Error, {
        batchSize: itemsToProcess.length,
      })
    }
    finally
    {
      processing = false
    }
  }

  function add(item: T): void
  {
    batch.push(item)

    // Schedule flush if not already scheduled
    if (timeoutId === null)
    {
      timeoutId = setTimeout(() =>
      {
        void flush()
      }, maxWaitMs)
    }

    // Flush immediately if batch is full
    if (batch.length >= maxSize)
    {
      void flush()
    }
  }

  return {
    add,
    flush,
    get size(): number
    {
      return batch.length
    },
  }
}

/**
 * Memory usage tracker for debugging memory leaks.
 * Samples memory usage periodically and warns on excessive growth.
 * 
 * Note: Only works in development mode to avoid overhead.
 */
export class MemoryTracker
{
  private samples: number[] = []
  private intervalId: ReturnType<typeof setInterval> | null = null
  private readonly maxSamples = 60 // Keep last 60 samples

  /**
   * Start tracking memory usage.
   * Samples every 10 seconds in development mode.
   */
  public start(): void
  {
    if (process.env.NODE_ENV !== 'development')
    {
      return
    }

    if (this.intervalId !== null)
    {
      logger.warn('Memory tracker already started')
      return
    }

    // Sample immediately
    this.sample()

    // Then sample every 10 seconds
    this.intervalId = setInterval(() =>
    {
      this.sample()
    }, 10000)

    logger.info('Memory tracker started')
  }

  /**
   * Stop tracking memory usage.
   */
  public stop(): void
  {
    if (this.intervalId !== null)
    {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('Memory tracker stopped')
    }
  }

  /**
   * Take a memory sample and check for issues.
   */
  private sample(): void
  {
    // Check if performance.memory is available (Chrome only)
    if (!performance || !('memory' in performance))
    {
      return
    }

    const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory
    if (!memory) return

    const usedMB = memory.usedJSHeapSize / 1024 / 1024

    this.samples.push(usedMB)

    // Keep only recent samples
    if (this.samples.length > this.maxSamples)
    {
      this.samples.shift()
    }

    // Check for memory leak: 20MB+ growth over last minute
    if (this.samples.length >= 6)
    {
      const recent = this.samples.slice(-6)
      const oldest = recent[0]
      const newest = recent[recent.length - 1]
      const growth = newest - oldest

      if (growth > 20)
      {
        logger.warn('Possible memory leak detected', {
          currentMB: usedMB.toFixed(2),
          growthMB: growth.toFixed(2),
          duration: '60s',
        })
      }
    }

    // Warn if memory usage is very high
    if (usedMB > 200)
    {
      logger.warn('High memory usage', {
        usedMB: usedMB.toFixed(2),
        threshold: '200MB',
      })
    }
  }

  /**
   * Get current memory usage statistics.
   */
  public getStats(): { current: number; average: number; max: number } | null
  {
    if (this.samples.length === 0) return null

    const current = this.samples[this.samples.length - 1]
    const average = this.samples.reduce((a, b) => a + b, 0) / this.samples.length
    const max = Math.max(...this.samples)

    return {
      current: Number(current.toFixed(2)),
      average: Number(average.toFixed(2)),
      max: Number(max.toFixed(2)),
    }
  }
}
