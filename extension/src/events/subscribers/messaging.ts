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
import type { StateTransitionEvent } from '@events/types'

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

  // Bridge error events → content script
  // Critical for showing executor errors and other infrastructure failures
  //
  // NOTE: Validation errors from executor-tool are NOT forwarded to UI.
  // These are expected errors that the LLM agent handles and explains naturally.
  // Only forward actual infrastructure failures to the UI.
  const errorSub = systemEvents.error$
    .pipe(
      filter(e =>
      {
        // Exclude validation errors from executor-tool
        // These are handled by the LLM agent and explained to the user
        const isExecutorValidation = e.type === 'validation' && e.payload.source === 'executor-tool'
        return !isExecutorValidation
      }),
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('messaging', 'Error messaging subscription cleaned up', {}))
    )
    .subscribe(e =>
    {
      emitSystemInfo('messaging', 'Sending error message to content script', {
        errorType: e.type,
        source: e.payload.source,
        message: e.payload.error.message
      })

      const message: BackgroundMessage = {
        type: 'error',
        error: e.payload.userMessage || e.payload.error.message
      }
      post(message)

      // Always send 'done' after error to reset UI state
      post({ type: 'done' })
    })

  subscriptions.push(errorSub)

  // Bridge state transition events → content script
  const stateSub = systemEvents.eventStream
    .pipe(
      filter((e): e is StateTransitionEvent => e.domain === 'state' && e.type === 'transition'),
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('messaging', 'State transition messaging cleaned up', {}))
    )
    .subscribe(e =>
    {
      const message: BackgroundMessage = {
        type: 'state_transition',
        previous: e.payload.previous,
        current: e.payload.current,
        trigger: e.payload.trigger,
        stateData: e.payload.stateData
      }
      post(message)
    })

  subscriptions.push(stateSub)

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


