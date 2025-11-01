/**
 * Messaging Subscriber
 *
 * Bridges events in the background worker context to chrome.runtime messages
 * that are sent to the content script. This is necessary because background
 * and content script have separate JavaScript contexts and can't share state.
 *
 * This subscriber converts SystemEvents → BackgroundMessages for the content script.
 *
 * Unlike other subscribers, this one uses per-connection cleanup with isolated
 * destroy subjects to prevent cross-connection interference.
 */

import { Subject, Subscription } from 'rxjs'
import { filter, takeUntil, finalize, switchMap } from 'rxjs/operators'
import { systemEvents, emitSystemInfo } from '@events/index'
import { getBaseUrlOrDefault } from '@platform/settings'
import type { BackgroundMessage } from '@shared/types/messaging'

/**
 * Create workflow created message
 *
 * @param workflowId - ID of the created workflow
 * @param baseUrl - n8n base URL
 * @returns Workflow created message for content script
 */
function createWorkflowCreatedMessage(
  workflowId: string,
  baseUrl: string
): BackgroundMessage
{
  return {
    type: 'workflow_created' as const,
    workflowId,
    workflowUrl: `${baseUrl}/workflow/${workflowId}`
  }
}

/**
 * Connection handle for managing per-connection subscriptions
 */
export type ConnectionHandle = {
  cleanup: () => void
}

/**
 * Setup messaging bridge with a post function
 *
 * Creates a connection-scoped subscription that can be cleaned up
 * independently of other connections.
 *
 * @param post - Function to send messages to content script
 * @returns Handle with cleanup function for this connection
 */
export function setup(post: (msg: BackgroundMessage) => void): ConnectionHandle
{
  // Create connection-scoped destroy subject (prevents cross-connection interference)
  const destroy$ = new Subject<void>()
  const subscriptions: Subscription[] = []

  // Bridge workflow events → content script
  const workflowSub = systemEvents.workflow$
    .pipe(
      filter(e => e.type === 'created'),
      switchMap(async e =>
      {
        emitSystemInfo('messaging', 'Workflow created event received, preparing message', {
          workflowId: e.payload.workflowId
        })
        const baseUrl = await getBaseUrlOrDefault()
        return createWorkflowCreatedMessage(e.payload.workflowId!, baseUrl)
      }),
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('messaging', 'Workflow messaging subscription cleaned up', {}))
    )
    .subscribe(msg => 
{
      if (msg.type === 'workflow_created') 
{
        emitSystemInfo('messaging', 'Sending workflow_created message to content script', {
          workflowId: msg.workflowId
        })
      }

      post(msg)
    })

  subscriptions.push(workflowSub)

  // Bridge agent events → content script
  // This allows UI to create separate messages per agent
  const agentSub = systemEvents.agent$
    .pipe(
      filter(e => e.type === 'started' || e.type === 'completed'),
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('messaging', 'Agent messaging subscription cleaned up', {}))
    )
    .subscribe(e =>
    {
      const message: BackgroundMessage = {
        type: 'agent_activity',
        agent: e.payload.agent as any,
        activity: e.type === 'started' ? 'planning' : 'complete',
        status: e.type === 'started' ? 'started' : 'complete',
        id: e.payload.sessionId || '',
        timestamp: e.timestamp
      }
      post(message)
    })

  subscriptions.push(agentSub)

  return {
    cleanup: () => 
{
      destroy$.next()
      destroy$.complete()
      // Explicit unsubscribe as safety net
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }
}

/**
 * Cleanup messaging subscriptions
 * @deprecated Use the ConnectionHandle.cleanup() returned from setup() instead
 */
export function cleanup(): void 
{
  // No-op: cleanup is now handled per-connection via ConnectionHandle
  // This function kept for backwards compatibility but does nothing
}

