/**
 * Activity Subscriber
 *
 * Tracks agent and LLM activities, displaying them in the UI.
 * Uses debouncing for rapid events and auto-cleanup after completion.
 */

import { Subject, merge } from 'rxjs'
import { map, debounceTime, delay, filter, catchError, takeUntil, finalize } from 'rxjs/operators'
import { EMPTY } from 'rxjs'
import { systemEvents } from '../index'
import { useChatStore } from '../../state/chatStore'
import { emitSubscriberError } from '../emitters'
import type { AgentActivity } from '../../state/chatStore'
import type { AgentEvent, LLMEvent } from '../types'

const destroy$ = new Subject<void>()

/**
 * Convert system event to agent activity for UI display
 */
function eventToActivity(event: AgentEvent | LLMEvent): AgentActivity {
  // Extract agent type from payload, defaulting to 'orchestrator' for LLM events
  const agent: AgentActivity['agent'] =
    'agent' in event.payload
      ? event.payload.agent
      : 'orchestrator'

  const status: AgentActivity['status'] =
    event.type === 'started' ? 'started' :
    event.type === 'completed' ? 'complete' :
    'working'

  return {
    id: `${event.domain}-${event.timestamp}`,
    agent,
    activity: event.type,
    status,
    timestamp: event.timestamp
  }
}

// Observable pipeline: activity updates (debounced)
const activityUpdates$ = merge(systemEvents.agent$, systemEvents.llm$).pipe(
  map(eventToActivity),
  debounceTime(50), // Debounce rapid events
  catchError(err => {
    emitSubscriberError(err, 'activity-updates')
    return EMPTY
  })
)

// Observable pipeline: auto-remove completed activities after 3 seconds
const activityCleanup$ = systemEvents.agent$.pipe(
  filter(e => e.type === 'completed'),
  delay(3000),
  map(e => `${e.domain}-${e.timestamp}`)
)

/**
 * Start tracking activities
 */
export function setup(): void {
  // Subscribe to activity updates
  activityUpdates$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[activity-updates] Subscription cleaned up'))
    )
    .subscribe(activity => useChatStore.getState().addActivity(activity))

  // Subscribe to activity cleanup
  activityCleanup$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[activity-cleanup] Subscription cleaned up'))
    )
    .subscribe(id => useChatStore.getState().removeActivity(id))
}

/**
 * Stop tracking and cleanup
 */
export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}

