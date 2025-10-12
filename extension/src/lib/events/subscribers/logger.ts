/**
 * Logger Subscriber
 *
 * Listens to ALL events and logs them to console.
 * Always active (not gated by isDevelopment) to ensure production logging.
 * Uses takeUntil() pattern for clean subscription management.
 */

import { Subject } from 'rxjs'
import { takeUntil, tap, finalize } from 'rxjs/operators'
import { systemEvents } from '../index'
import type {
  SystemEvent,
  WorkflowEvent,
  AgentEvent,
  LLMEvent,
  ErrorEvent,
  StorageEvent,
  SystemInfoEvent
} from '../types'

const destroy$ = new Subject<void>()

/**
 * Shared logging utilities for consistent formatting
 */
function createLogGroup(title: string, color: string, collapsed: boolean): void {
  const style = `color: ${color}; font-weight: bold`
  if (collapsed) {
    console.groupCollapsed(`%c${title}`, style)
  } else {
    console.group(`%c${title}`, style)
  }
}

function logCleanup(): void {
  console.log('[logger] Subscription cleaned up')
}

function formatTitle(domain: string, type: string, details: string[], timestamp: number): string {
  const prefix = `[${domain}]`
  const time = new Date(timestamp).toLocaleTimeString()
  let title = `${prefix} ${type}`

  if (details.length > 0) {
    title += ` - ${details.join(' ')}`
  }

  title += ` @ ${time}`
  return title
}

/**
 * Generic event logger that handles the common pattern
 */
function logEventWithPayload<T extends SystemEvent>(
  event: T,
  color: string,
  collapsed: boolean,
  extractDetails: (payload: T['payload']) => string[],
  logContent?: (payload: T['payload']) => void
): void {
  const details = extractDetails(event.payload)
  const title = formatTitle(event.domain, event.type, details, event.timestamp)

  createLogGroup(title, color, collapsed)

  if (logContent) {
    logContent(event.payload)
  } else if (event.payload && Object.keys(event.payload).length > 0) {
    console.log('Payload:', event.payload)
  }

  console.groupEnd()
}

/**
 * Log workflow events (created, updated, validated, failed)
 */
function logWorkflowEvent(event: WorkflowEvent): void {
  logEventWithPayload(
    event,
    '#6366f1',
    true,
    (p) => {
      const details: string[] = []
      if (p.workflow?.name) details.push(`"${p.workflow.name}"`)
      if (p.workflowId) details.push(`id: ${p.workflowId}`)
      return details
    }
  )
}

/**
 * Log agent events (started, completed, tool_started, tool_completed)
 */
function logAgentEvent(event: AgentEvent): void {
  logEventWithPayload(
    event,
    '#8b5cf6',
    true,
    (p) => {
      const details: string[] = []
      if (p.agent) details.push(p.agent)
      if (p.action) details.push(p.action)
      if (p.tool) details.push(`tool: ${p.tool}`)
      return details
    }
  )
}

/**
 * Log LLM events (started, completed, streaming)
 */
function logLLMEvent(event: LLMEvent): void {
  logEventWithPayload(
    event,
    '#10b981',
    true,
    (p) => {
      const details: string[] = []
      if (p.model) details.push(p.model)
      if (p.provider) details.push(`(${p.provider})`)

      // Calculate total tokens from prompt + completion
      const totalTokens = (p.tokens?.prompt ?? 0) + (p.tokens?.completion ?? 0)
      if (totalTokens > 0) details.push(`${totalTokens} tokens`)

      return details
    }
  )
}

/**
 * Log error events (validation, api, llm, subscriber, unhandled)
 * Always expanded (not collapsed) for visibility
 */
function logErrorEvent(event: ErrorEvent): void {
  logEventWithPayload(
    event,
    '#ef4444',
    false, // Always expanded for errors
    (p) => {
      const details: string[] = []
      if (p.source) details.push(p.source)
      if (p.error?.message) details.push(p.error.message.slice(0, 50))
      return details
    },
    (p) => {
      console.error('Error:', p.error)
      if (p.source) console.log('Source:', p.source)
      if (p.context) console.log('Context:', p.context)
    }
  )
}

/**
 * Log storage events (saved, loaded, deleted)
 */
function logStorageEvent(event: StorageEvent): void {
  logEventWithPayload(
    event,
    '#f59e0b',
    true,
    (p) => {
      const details: string[] = []
      if (p.key) details.push(`key: ${p.key}`)
      return details
    }
  )
}

/**
 * Log system info events (init, info, debug)
 */
function logSystemInfoEvent(event: SystemInfoEvent): void {
  // Use different colors for different levels
  const color = event.payload.level === 'debug' ? '#6b7280' : '#3b82f6'

  logEventWithPayload(
    event,
    color,
    true,
    (p) => {
      const details: string[] = []
      if (p.component) details.push(p.component)
      if (p.message) details.push(p.message)
      return details
    },
    (p) => {
      if (p.data && Object.keys(p.data).length > 0) {
        console.log('Data:', p.data)
      }
    }
  )
}

/**
 * Route events to appropriate logging function
 */
function logEvent(event: SystemEvent): void {
  switch (event.domain) {
    case 'workflow':
      logWorkflowEvent(event)
      break
    case 'agent':
      logAgentEvent(event)
      break
    case 'llm':
      logLLMEvent(event)
      break
    case 'error':
      logErrorEvent(event)
      break
    case 'storage':
      logStorageEvent(event)
      break
    case 'system':
      logSystemInfoEvent(event)
      break
  }
}

// Observable pipeline: log all events
const logEvents$ = systemEvents.eventStream.pipe(
  tap(logEvent)
)

/**
 * Start logging all events
 */
export function setup(): void {
  logEvents$
    .pipe(
      takeUntil(destroy$),
      finalize(logCleanup)
    )
    .subscribe()
}

/**
 * Stop logging and cleanup
 */
export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}

