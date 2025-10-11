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

const destroy$ = new Subject<void>()

/**
 * Shared logging utility for consistent formatting
 */
function createLogGroup(title: string, color: string, collapsed: boolean): void {
  const style = `color: ${color}; font-weight: bold`
  if (collapsed) {
    console.groupCollapsed(`%c${title}`, style)
  } else {
    console.group(`%c${title}`, style)
  }
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
 * Log workflow events (created, updated, validated, failed)
 */
function logWorkflowEvent(event: any): void {
  const details: string[] = []
  const p = event.payload

  if (p.workflow?.name) details.push(`"${p.workflow.name}"`)
  if (p.workflowId) details.push(`id: ${p.workflowId}`)

  const title = formatTitle(event.domain, event.type, details, event.timestamp)
  createLogGroup(title, '#6366f1', true)

  if (event.payload && Object.keys(event.payload).length > 0) {
    console.log('Payload:', event.payload)
  }

  console.groupEnd()
}

/**
 * Log agent events (started, completed, tool_started, tool_completed)
 */
function logAgentEvent(event: any): void {
  const details: string[] = []
  const p = event.payload

  if (p.agent) details.push(p.agent)
  if (p.action) details.push(p.action)
  if (p.tool) details.push(`tool: ${p.tool}`)

  const title = formatTitle(event.domain, event.type, details, event.timestamp)
  createLogGroup(title, '#8b5cf6', true)

  if (event.payload && Object.keys(event.payload).length > 0) {
    console.log('Payload:', event.payload)
  }

  console.groupEnd()
}

/**
 * Log LLM events (started, completed, streaming)
 */
function logLLMEvent(event: any): void {
  const details: string[] = []
  const p = event.payload

  if (p.model) details.push(p.model)
  if (p.provider) details.push(`(${p.provider})`)
  if (p.usage?.total_tokens) details.push(`${p.usage.total_tokens} tokens`)

  const title = formatTitle(event.domain, event.type, details, event.timestamp)
  createLogGroup(title, '#10b981', true)

  if (event.payload && Object.keys(event.payload).length > 0) {
    console.log('Payload:', event.payload)
  }

  console.groupEnd()
}

/**
 * Log error events (validation, api, llm, subscriber, unhandled)
 * Always expanded (not collapsed) for visibility
 */
function logErrorEvent(event: any): void {
  const details: string[] = []
  const p = event.payload

  if (p.source) details.push(p.source)
  if (p.error?.message) details.push(p.error.message.slice(0, 50))

  const title = formatTitle(event.domain, event.type, details, event.timestamp)
  createLogGroup(title, '#ef4444', false) // Always expanded

  console.error('Error:', event.payload.error)

  if (event.payload.source) {
    console.log('Source:', event.payload.source)
  }

  if (event.payload.context) {
    console.log('Context:', event.payload.context)
  }

  console.groupEnd()
}

/**
 * Log storage events (saved, loaded, deleted)
 */
function logStorageEvent(event: any): void {
  const details: string[] = []
  const p = event.payload

  if (p.key) details.push(`key: ${p.key}`)

  const title = formatTitle(event.domain, event.type, details, event.timestamp)
  createLogGroup(title, '#f59e0b', true)

  if (event.payload && Object.keys(event.payload).length > 0) {
    console.log('Payload:', event.payload)
  }

  console.groupEnd()
}

/**
 * Route events to appropriate logging function
 */
function logEvent(event: any): void {
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
    default:
      // Fallback for unknown domains
      const title = formatTitle(event.domain, event.type, [], event.timestamp)
      createLogGroup(title, '#6b7280', true)
      console.log('Payload:', event.payload)
      console.groupEnd()
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
      finalize(() => console.log('[logger] Subscription cleaned up'))
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

