/**
 * Structured logging service for the n8n extension.
 * Provides log levels, context tracking, and secure storage.
 */

export enum LogLevel
{
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export type LogEntry = {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

type LogStorage = {
  entries: LogEntry[]
  maxEntries: number
}

/**
 * Sanitize sensitive data from logs.
 * Removes API keys, tokens, and other sensitive information.
 */
function sanitize(value: unknown): unknown
{
  if (typeof value === 'string')
  {
    // Mask API keys (sk-... or similar patterns)
    if (value.match(/^sk-[a-zA-Z0-9]{20,}$/))
    {
      return '[REDACTED_API_KEY]'
    }

    // Mask bearer tokens
    if (value.match(/^Bearer\s+/i))
    {
      return '[REDACTED_TOKEN]'
    }

    return value
  }

  if (Array.isArray(value))
  {
    return value.map(sanitize)
  }

  if (value && typeof value === 'object')
  {
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value))
    {
      // Skip sensitive keys
      const lowerKey = key.toLowerCase()
      if (lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('password'))
      {
        sanitized[key] = '[REDACTED]'
      }
      else
      {
        sanitized[key] = sanitize(val)
      }
    }
    return sanitized
  }

  return value
}

/**
 * Centralized logger for the extension.
 * Singleton pattern for consistent logging across all components.
 */
class Logger
{
  private minLevel: LogLevel = LogLevel.INFO
  private storage: LogStorage = { entries: [], maxEntries: 100 }

  constructor()
  {
    // Set log level based on environment
    if (process.env.NODE_ENV === 'development')
    {
      this.minLevel = LogLevel.DEBUG
    }
  }

  /**
   * Set the minimum log level to record.
   */
  public setLevel(level: LogLevel): void
  {
    this.minLevel = level
  }

  /**
   * Log a debug message.
   */
  public debug(message: string, context?: Record<string, unknown>): void
  {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log an info message.
   */
  public info(message: string, context?: Record<string, unknown>): void
  {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log a warning message.
   */
  public warn(message: string, context?: Record<string, unknown>): void
  {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log an error message.
   */
  public error(message: string, error?: Error, context?: Record<string, unknown>): void
  {
    const errorContext = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined

    this.log(LogLevel.ERROR, message, context, errorContext)
  }

  /**
   * Internal logging method.
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    errorContext?: { name: string; message: string; stack?: string }
  ): void
  {
    if (level < this.minLevel) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? (sanitize(context) as Record<string, unknown>) : undefined,
      error: errorContext,
    }

    // Add to in-memory storage
    this.storage.entries.push(entry)
    if (this.storage.entries.length > this.storage.maxEntries)
    {
      this.storage.entries.shift()
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development')
    {
      this.logToConsole(entry)
    }
  }

  /**
   * Output log entry to console.
   */
  private logToConsole(entry: LogEntry): void
  {
    const levelName = LogLevel[entry.level]
    const prefix = `[${entry.timestamp}] [${levelName}]`

    switch (entry.level)
    {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context || '')
        break
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context || '')
        break
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.context || '')
        break
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.error || '', entry.context || '')
        break
    }
  }

  /**
   * Get all log entries.
   */
  public getEntries(): LogEntry[]
  {
    return [...this.storage.entries]
  }

  /**
   * Clear all log entries.
   */
  public clear(): void
  {
    this.storage.entries = []
  }

  /**
   * Export logs as JSON string for debugging.
   */
  public export(): string
  {
    return JSON.stringify(this.storage.entries, null, 2)
  }
}

// Singleton instance
export const logger = new Logger()
