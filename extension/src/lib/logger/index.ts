/**
 * Centralized logger service with sensitive data sanitization
 * 
 * Provides structured logging with different levels and automatic sanitization
 * of sensitive information like API keys, tokens, and credentials.
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const

export type LogLevel = typeof LogLevel[keyof typeof LogLevel]

export type LogEntry = {
  timestamp: number
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  error?: Error
}

type LoggerOptions = {
  /** Minimum log level to output (default: INFO in production, DEBUG in development) */
  minLevel?: LogLevel
  /** Whether to store logs in chrome.storage (default: true in development) */
  persistLogs?: boolean
  /** Maximum number of logs to store (default: 100) */
  maxStoredLogs?: number
}

const STORAGE_KEY = 'n8n-pro-logs'
const DEFAULT_MAX_LOGS = 100

/**
 * Patterns to detect sensitive data that should be sanitized
 */
const SENSITIVE_PATTERNS = [
  // API Keys
  /sk-[a-zA-Z0-9]{32,}/gi,
  /n8n[_-]?api[_-]?key[_-]?[a-zA-Z0-9]+/gi,
  /api[_-]?key[:\s]*[a-zA-Z0-9_-]{20,}/gi,
  
  // Tokens
  /bearer\s+[a-zA-Z0-9_-]+/gi,
  /token[:\s]*[a-zA-Z0-9_-]{20,}/gi,
  
  // Credentials
  /password[:\s]*[^\s,}]+/gi,
  /secret[:\s]*[^\s,}]+/gi,
  
  // Authorization headers
  /authorization[:\s]*[^\n,}]+/gi,
  /x-[a-z-]+-key[:\s]*[^\n,}]+/gi,
]

/**
 * Sanitize sensitive data from strings
 */
function sanitize(value: string): string
{
  let sanitized = value

  for (const pattern of SENSITIVE_PATTERNS)
  {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  }

  return sanitized
}

/**
 * Sanitize sensitive data from objects
 */
function sanitizeObject(obj: unknown): unknown
{
  if (obj === null || obj === undefined)
  {
    return obj
  }

  if (typeof obj === 'string')
  {
    return sanitize(obj)
  }

  if (typeof obj !== 'object')
  {
    return obj
  }

  if (Array.isArray(obj))
  {
    return obj.map(sanitizeObject)
  }

  const sanitized: Record<string, unknown> = {}
  const record = obj as Record<string, unknown>

  for (const [key, value] of Object.entries(record))
  {
    // Redact known sensitive keys
    const lowerKey = key.toLowerCase()
    if (
      lowerKey.includes('key') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('auth')
    )
    {
      sanitized[key] = '[REDACTED]'
    }
    else
    {
      sanitized[key] = sanitizeObject(value)
    }
  }

  return sanitized
}

/**
 * Centralized logger with sanitization
 */
class Logger
{
  private minLevel: LogLevel
  private persistLogs: boolean
  private maxStoredLogs: number
  private logs: LogEntry[] = []

  constructor(options: LoggerOptions = {})
  {
    this.minLevel = options.minLevel ?? (
      process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
    )
    this.persistLogs = options.persistLogs ?? (process.env.NODE_ENV === 'development')
    this.maxStoredLogs = options.maxStoredLogs ?? DEFAULT_MAX_LOGS

    // Load persisted logs if enabled
    if (this.persistLogs)
    {
      void this.loadLogs()
    }
  }

  private shouldLog(level: LogLevel): boolean
  {
    return level >= this.minLevel
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry
  {
    return {
      timestamp: Date.now(),
      level,
      message: sanitize(message),
      context: context ? sanitizeObject(context) as Record<string, unknown> : undefined,
      error,
    }
  }

  private async persistLog(entry: LogEntry): Promise<void>
  {
    if (!this.persistLogs) return

    this.logs.push(entry)

    // Trim logs if exceeding max size
    if (this.logs.length > this.maxStoredLogs)
    {
      this.logs = this.logs.slice(-this.maxStoredLogs)
    }

    // Save to chrome.storage
    try
    {
      await chrome.storage.local.set({ [STORAGE_KEY]: this.logs })
    }
    catch (error)
    {
      // Silently fail to avoid infinite logging loop
      console.error('Failed to persist logs:', error)
    }
  }

  private async loadLogs(): Promise<void>
  {
    try
    {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      this.logs = (result[STORAGE_KEY] as LogEntry[]) ?? []
    }
    catch (error)
    {
      console.error('Failed to load logs:', error)
    }
  }

  private formatMessage(entry: LogEntry): string
  {
    const levelName = Object.keys(LogLevel).find(
      key => LogLevel[key as keyof typeof LogLevel] === entry.level
    ) || 'UNKNOWN'
    const timestamp = new Date(entry.timestamp).toISOString()
    let msg = `[${timestamp}] ${levelName}: ${entry.message}`

    if (entry.context)
    {
      msg += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
    }

    if (entry.error)
    {
      msg += `\n  Error: ${entry.error.message}`
      if (entry.error.stack)
      {
        msg += `\n  Stack: ${entry.error.stack}`
      }
    }

    return msg
  }

  private consoleLog(entry: LogEntry): void
  {
    const msg = this.formatMessage(entry)

    switch (entry.level)
    {
      case LogLevel.DEBUG:
        console.debug(msg)
        break
      case LogLevel.INFO:
        console.info(msg)
        break
      case LogLevel.WARN:
        console.warn(msg)
        break
      case LogLevel.ERROR:
        console.error(msg)
        break
    }
  }

  debug(message: string, context?: Record<string, unknown>): void
  {
    if (!this.shouldLog(LogLevel.DEBUG)) return

    const entry = this.createEntry(LogLevel.DEBUG, message, context)
    this.consoleLog(entry)
    void this.persistLog(entry)
  }

  info(message: string, context?: Record<string, unknown>): void
  {
    if (!this.shouldLog(LogLevel.INFO)) return

    const entry = this.createEntry(LogLevel.INFO, message, context)
    this.consoleLog(entry)
    void this.persistLog(entry)
  }

  warn(message: string, context?: Record<string, unknown>): void
  {
    if (!this.shouldLog(LogLevel.WARN)) return

    const entry = this.createEntry(LogLevel.WARN, message, context)
    this.consoleLog(entry)
    void this.persistLog(entry)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void
  {
    if (!this.shouldLog(LogLevel.ERROR)) return

    const entry = this.createEntry(LogLevel.ERROR, message, context, error)
    this.consoleLog(entry)
    void this.persistLog(entry)
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[]
  {
    return [...this.logs]
  }

  /**
   * Clear all stored logs
   */
  async clearLogs(): Promise<void>
  {
    this.logs = []
    
    if (this.persistLogs)
    {
      try
      {
        await chrome.storage.local.remove(STORAGE_KEY)
      }
      catch (error)
      {
        console.error('Failed to clear logs:', error)
      }
    }
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string
  {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Singleton instance
export const logger = new Logger()

// Convenience exports
export const debug = logger.debug.bind(logger)
export const info = logger.info.bind(logger)
export const warn = logger.warn.bind(logger)
export const error = logger.error.bind(logger)
