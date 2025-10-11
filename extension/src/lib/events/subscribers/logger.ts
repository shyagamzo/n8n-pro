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
  const style = 'color: #6366f1; font-weight: bold'
  
  // Always log errors prominently
  if (event.domain === 'error') {
    console.group(`%c${prefix} ${event.type}`, 'color: #ef4444; font-weight: bold')
    console.error('Error:', event.payload.error)
    if (event.payload.context) {
      console.log('Context:', event.payload.context)
    }
    console.groupEnd()
    return
  }
  
  // Log other events with collapsed groups
  console.groupCollapsed(`%c${prefix} ${event.type}`, style)
  if (event.payload && Object.keys(event.payload).length > 0) {
    console.log('Payload:', event.payload)
  }
  console.log('Timestamp:', new Date(event.timestamp).toLocaleTimeString())
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

