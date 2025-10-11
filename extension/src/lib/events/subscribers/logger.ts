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
 * Format and log an event to console
 * Always logs regardless of environment (unlike debug utility)
 */
function logEvent(event: any): void {
  const prefix = `[${event.domain}]`
  const time = new Date(event.timestamp).toLocaleTimeString()
  
  // Build informative title with key details from payload
  let title = `${prefix} ${event.type}`
  let details: string[] = []
  
  // Extract key details based on domain/type
  const p = event.payload
  
  switch (event.domain) {
    case 'workflow':
      if (p.workflow?.name) details.push(`"${p.workflow.name}"`)
      if (p.workflowId) details.push(`id: ${p.workflowId}`)
      break
      
    case 'agent':
      if (p.agent) details.push(p.agent)
      if (p.action) details.push(p.action)
      if (p.tool) details.push(`tool: ${p.tool}`)
      break
      
    case 'llm':
      if (p.model) details.push(p.model)
      if (p.provider) details.push(`(${p.provider})`)
      if (p.usage?.total_tokens) details.push(`${p.usage.total_tokens} tokens`)
      break
      
    case 'storage':
      if (p.key) details.push(`key: ${p.key}`)
      break
  }
  
  // Add details to title
  if (details.length > 0) {
    title += ` - ${details.join(' ')}`
  }
  
  // Add timestamp to title
  title += ` @ ${time}`
  
  // Always log errors prominently (expanded)
  if (event.domain === 'error') {
    console.group(`%c${title}`, 'color: #ef4444; font-weight: bold')
    console.error('Error:', event.payload.error)
    if (event.payload.source) {
      console.log('Source:', event.payload.source)
    }
    if (event.payload.context) {
      console.log('Context:', event.payload.context)
    }
    console.groupEnd()
    return
  }
  
  // Log other events with collapsed groups
  console.groupCollapsed(`%c${title}`, 'color: #6366f1; font-weight: bold')
  if (event.payload && Object.keys(event.payload).length > 0) {
    console.log('Payload:', event.payload)
  }
  console.groupEnd()
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

