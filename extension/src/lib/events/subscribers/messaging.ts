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
import { filter, takeUntil, finalize, switchMap } from 'rxjs/operators'
import { systemEvents } from '../index'
import { getBaseUrl } from '../../services/settings'
import type { BackgroundMessage } from '../../types/messaging'

const destroy$ = new Subject<void>()

/**
 * Setup messaging bridge with a post function
 * @param post - Function to send messages to content script
 */
export function setup(post: (msg: BackgroundMessage) => void): void {
  // Bridge workflow events → content script
  systemEvents.workflow$
    .pipe(
      filter(e => e.type === 'created'),
      switchMap(async e => {
        const baseUrl = await getBaseUrl()
        return {
          type: 'workflow_created' as const,
          workflowId: e.payload.workflowId!,
          workflowUrl: `${baseUrl || 'http://localhost:5678'}/workflow/${e.payload.workflowId}`
        }
      }),
      takeUntil(destroy$),
      finalize(() => console.log('[messaging-workflow] Cleaned up'))
    )
    .subscribe(msg => post(msg))

  // Note: Agent activity events will be bridged in future when content script
  // has its own event system. For now, activity indicators can be handled differently.
}

/**
 * Cleanup messaging subscriptions
 */
export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}

