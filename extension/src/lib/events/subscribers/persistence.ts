/**
 * Persistence Subscriber
 * 
 * Automatically saves important events to chrome.storage.
 * Uses switchMap for async operations and debouncing to prevent excessive writes.
 */

import { Subject, merge } from 'rxjs'
import { filter, debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil, finalize } from 'rxjs/operators'
import { EMPTY, from } from 'rxjs'
import { systemEvents } from '../index'
import { storageSet } from '../../utils/storage'
import { STORAGE_KEYS } from '../../constants'
import { emitSubscriberError } from '../emitters'

const destroy$ = new Subject<void>()

// Observable pipeline: persistable events with debouncing
const persistableEvents$ = merge(
  systemEvents.workflow$.pipe(filter(e => e.type === 'created'))
).pipe(
  debounceTime(1000), // Debounce to avoid excessive writes
  distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), // Only save if changed
  switchMap((event) => from((async () => {
    // Save to chrome.storage based on event type
    if (event.domain === 'workflow') {
      await storageSet(STORAGE_KEYS.LAST_WORKFLOW, event.payload.workflow)
    }
    return event
  })())),
  catchError(err => {
    emitSubscriberError(err, 'persistence')
    return EMPTY
  })
)

/**
 * Start auto-persisting events
 */
export function setup(): void {
  persistableEvents$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[persistence] Subscription cleaned up'))
    )
    .subscribe()
}

/**
 * Stop persisting and cleanup
 */
export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}

