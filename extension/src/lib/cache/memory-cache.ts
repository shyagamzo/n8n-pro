/**
 * Memory cache with TTL (Time To Live) support
 * Provides in-memory caching for API responses with automatic expiration
 */

export type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export type CacheOptions = {
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number
  /** Maximum cache size (default: 100 entries) */
  maxSize?: number
  /** Callback when cache entry is evicted */
  onEvict?: (key: string, value: unknown) => void
}

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const DEFAULT_MAX_SIZE = 100

/**
 * Simple in-memory cache with TTL support
 */
export class MemoryCache<T = unknown>
{
  private cache = new Map<string, CacheEntry<T>>()
  private readonly defaultTTL: number
  private readonly maxSize: number
  private readonly onEvict?: (key: string, value: T) => void

  constructor(options: CacheOptions = {})
  {
    this.defaultTTL = options.defaultTTL ?? DEFAULT_TTL
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE
    this.onEvict = options.onEvict
  }

  /**
   * Get a value from cache
   * Returns undefined if key doesn't exist or has expired
   */
  get(key: string): T | undefined
  {
    const entry = this.cache.get(key)
    
    if (!entry)
    {
      return undefined
    }

    // Check if expired
    if (Date.now() > entry.expiresAt)
    {
      this.delete(key)
      return undefined
    }

    return entry.value
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key: string, value: T, ttlMs?: number): void
  {
    // Enforce max size by removing oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key))
    {
      const firstKey = this.cache.keys().next().value as string
      this.delete(firstKey)
    }

    const ttl = ttlMs ?? this.defaultTTL
    const expiresAt = Date.now() + ttl

    this.cache.set(key, { value, expiresAt })
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean
  {
    return this.get(key) !== undefined
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean
  {
    const entry = this.cache.get(key)
    const deleted = this.cache.delete(key)

    if (deleted && entry && this.onEvict)
    {
      this.onEvict(key, entry.value)
    }

    return deleted
  }

  /**
   * Clear all entries from cache
   */
  clear(): void
  {
    if (this.onEvict)
    {
      for (const [key, entry] of this.cache.entries())
      {
        this.onEvict(key, entry.value)
      }
    }

    this.cache.clear()
  }

  /**
   * Get current cache size
   */
  get size(): number
  {
    return this.cache.size
  }

  /**
   * Remove all expired entries
   */
  cleanup(): void
  {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries())
    {
      if (now > entry.expiresAt)
      {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete)
    {
      this.delete(key)
    }
  }

  /**
   * Get or set a value in cache
   * If key exists and is not expired, return cached value
   * Otherwise, call factory function, cache result, and return it
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T>
  {
    const cached = this.get(key)
    
    if (cached !== undefined)
    {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttlMs)
    return value
  }

  /**
   * Get all keys in cache (including expired ones)
   */
  keys(): string[]
  {
    return Array.from(this.cache.keys())
  }

  /**
   * Get all non-expired values in cache
   */
  values(): T[]
  {
    const values: T[] = []
    const now = Date.now()

    for (const entry of this.cache.values())
    {
      if (now <= entry.expiresAt)
      {
        values.push(entry.value)
      }
    }

    return values
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    defaultTTL: number
    expiredCount: number
  }
  {
    const now = Date.now()
    let expiredCount = 0

    for (const entry of this.cache.values())
    {
      if (now > entry.expiresAt)
      {
        expiredCount++
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
      expiredCount,
    }
  }
}

/**
 * Create a cached version of an async function
 * 
 * @example
 * ```ts
 * const cache = new MemoryCache()
 * const cachedFetch = cached(
 *   cache,
 *   (url: string) => fetch(url).then(r => r.json()),
 *   (url) => `fetch:${url}`, // key generator
 *   60_000 // TTL: 1 minute
 * )
 * 
 * const data1 = await cachedFetch('https://api.example.com/data')
 * const data2 = await cachedFetch('https://api.example.com/data') // Returns cached
 * ```
 */
export function cached<TArgs extends unknown[], TResult>(
  cache: MemoryCache<TResult>,
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,
  ttlMs?: number
): (...args: TArgs) => Promise<TResult>
{
  return async (...args: TArgs): Promise<TResult> =>
  {
    const key = keyGenerator(...args)
    return cache.getOrSet(key, () => fn(...args), ttlMs)
  }
}
