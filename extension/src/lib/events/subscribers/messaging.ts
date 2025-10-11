/**
 * Messaging Subscriber
 * 
 * Bridges events in the background worker context to chrome.runtime messages
 * that are sent to the content script. This is necessary because background
 * and content script have separate JavaScript contexts and can't share state.
 * 
 * This subscriber converts SystemEvents → BackgroundMessages for the content script.
 */

import { Subject } from 'rxjs'
import { filter, map, takeUntil, finalize } from 'rxjs/operators'
import { systemEvents } from '../index'
import type { BackgroundMessage } from '../../types/messaging'

const destroy$ = new Subject<void>()

/**
 * Setup messaging bridge with a post function
 * @param post - Function to send messages to content script (usually chrome.runtime.Port.postMessage)
 */
export function setup(post: (msg: BackgroundMessage) => void): void {
  // Workflow created → workflow_created message
  systemEvents.workflow$
    .pipe(
      filter(e => e.type === 'created'),
      map(e => ({
        type: 'workflow_created' as const,
        workflowId: e.payload.workflowId!,
        workflowUrl: `http://localhost:5678/workflow/${e.payload.workflowId}`
      })),
      takeUntil(destroy$),
      finalize(() => console.log('[messaging-workflow] Subscription cleaned up'))
    )
    .subscribe(msg => post(msg))
  
  // Note: Error events are already handled by background worker's post({ type: 'error' })
  // so we don't need to bridge them here to avoid duplicates
}

/**
 * Cleanup messaging subscriptions
 */
export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}

