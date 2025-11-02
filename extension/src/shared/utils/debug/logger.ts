/**
 * Core Debug Logger
 *
 * Provides structured logging with colored console output for development.
 */

import { sanitize } from './sanitize'

/**
 * Check if running in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Log context structure
 */
export type LogContext = {
  component: string
  action: string
  data?: unknown
  error?: Error | unknown
}

/**
 * Log a debug message with context
 *
 * Development-only structured logging with colored console groups.
 *
 * @param context - Log context with component, action, data, and error
 *
 * @example
 * ```typescript
 * debug({
 *   component: 'WorkflowCreation',
 *   action: 'Creating workflow',
 *   data: { name: 'My Workflow' }
 * })
 * ```
 */
export function debug(context: LogContext): void
{
  if (!isDevelopment) return

  const { component, action, data, error } = context
  const prefix = `[${component}]`

  console.group(`%c${prefix} ${action}`, 'color: #6366f1; font-weight: bold')

  if (data)
  {
    console.log('%cData:', 'color: #8b5cf6', sanitize(data))
  }

  if (error)
  {
    console.error('%cError:', 'color: #ef4444', error)

    if (error instanceof Error && error.stack)
    {
      console.log('%cStack:', 'color: #f97316', error.stack)
    }
  }

  console.groupEnd()
}

/**
 * Debug session logger for tracking related operations
 *
 * Accumulates logs across a session and outputs them as a group.
 * Useful for tracking multi-step processes.
 *
 * @example
 * ```typescript
 * const session = new DebugSession('WorkflowCreation', 'Create from plan')
 * session.log('Starting validation')
 * session.log('Validation complete', { valid: true })
 * session.end(true)
 * ```
 */
export class DebugSession
{
  private readonly sessionId: string
  private readonly startTime: number
  private logs: Array<{ timestamp: number; message: string; data?: unknown }> = []

  constructor(component: string, action: string)
  {
    this.sessionId = `${component}-${action}-${Date.now()}`
    this.startTime = Date.now()
    this.log('Session started')
  }

  /**
   * Add a log entry to the session
   */
  public log(message: string, data?: unknown): void
  {
    this.logs.push({
      timestamp: Date.now() - this.startTime,
      message,
      data: data ? sanitize(data) : undefined
    })
  }

  /**
   * End the session and output all logs
   */
  public end(success: boolean): void
  {
    const duration = Date.now() - this.startTime
    this.log(`Session ended: ${success ? 'SUCCESS' : 'FAILURE'} (${duration}ms)`)

    if (isDevelopment)
    {
      console.group(`%c[Session] ${this.sessionId}`, 'color: #8b5cf6; font-weight: bold')
      this.logs.forEach(log =>
      {
        console.log(`%c+${log.timestamp}ms`, 'color: #6b7280', log.message, log.data || '')
      })
      console.groupEnd()
    }
  }

  public getSessionId(): string
  {
    return this.sessionId
  }

  public getLogs(): Array<{ timestamp: number; message: string; data?: unknown }>
  {
    return [...this.logs]
  }
}
