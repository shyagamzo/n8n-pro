/**
 * Chat Subscriber
 *
 * Transforms workflow and error events into chat messages.
 * Updates the chat store reactively when events occur.
 */

import { Subject } from 'rxjs'
import { filter, map, catchError, takeUntil, finalize } from 'rxjs/operators'
import { EMPTY } from 'rxjs'
import { systemEvents } from '@events/index'
import { useChatStore } from '@ui/chatStore'
import { generateId } from '@shared/utils/id'
import { emitSubscriberError, emitSystemInfo } from '@events/emitters'

const destroy$ = new Subject<void>()

// Observable pipeline: workflow success messages
const workflowMessages$ = systemEvents.workflow$.pipe(
  filter(e => e.type === 'created'),
  map(e => ({
    id: generateId(),
    role: 'assistant' as const,
    text: `✅ Workflow "${e.payload.workflow.name}" created!`
  })),
  catchError(err => 
{
    emitSubscriberError(err, 'chat-workflow')
    return EMPTY
  })
)

// Observable pipeline: error messages
const errorMessages$ = systemEvents.error$.pipe(
  map(e => ({
    id: generateId(),
    role: 'error' as const,
    text: e.payload.userMessage || `❌ ${e.payload.error.message}`,
    error: {
      title: 'Error',
      details: e.payload.error.message,
      retryable: e.payload.source !== 'subscriber' // Subscriber errors aren't retryable
    }
  })),
  catchError(err => 
{
    emitSubscriberError(err, 'chat-error')
    return EMPTY
  })
)

/**
 * Start subscribing to events and updating chat
 */
export function setup(): void 
{
  // Subscribe to workflow messages
  workflowMessages$
    .pipe(
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('chat', 'Workflow messages subscription cleaned up', {}))
    )
    .subscribe(msg => useChatStore.getState().addMessage(msg))

  // Subscribe to error messages
  errorMessages$
    .pipe(
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('chat', 'Error messages subscription cleaned up', {}))
    )
    .subscribe(msg => useChatStore.getState().addMessage(msg))
}

/**
 * Stop subscribing and cleanup
 */
export function cleanup(): void 
{
  destroy$.next()
  destroy$.complete()
}

