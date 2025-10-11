/**
 * Logger Subscriber
 * 
 * Listens to ALL events and logs them using the debug utility.
 * Uses takeUntil() pattern for clean subscription management.
 */

import { Subject } from 'rxjs'
import { takeUntil, tap, finalize } from 'rxjs/operators'
import { systemEvents } from '../index'
import { debug } from '../../utils/debug'

const destroy$ = new Subject<void>()

// Observable pipeline: log all events
const logEvents$ = systemEvents.eventStream.pipe(
  tap(event => {
    debug({
      component: event.domain,
      action: event.type,
      data: event.payload,
      error: event.domain === 'error' ? event.payload.error : undefined
    })
  })
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

