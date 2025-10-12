/**
 * Persistence Subscriber
 *
 * Automatically saves important events to chrome.storage.
 * Uses switchMap for async operations and debouncing to prevent excessive writes.
 */

import { Subject } from 'rxjs'
import { takeUntil, finalize, switchMap, debounceTime, filter, catchError } from 'rxjs/operators'
import { EMPTY } from 'rxjs'
import { systemEvents } from '../index'
import { emitStorageSave, emitSubscriberError, emitSystemInfo } from '../emitters'
import { storageGet, storageSet } from '../../utils/storage'
import { STORAGE_KEYS } from '../../constants'
import type { WorkflowEvent } from '../types'

const destroy$ = new Subject<void>()

export type WorkflowHistoryEntry = {
  id: string
  name: string
  createdAt: number
  workflowId?: string
}

/**
 * Persist workflow creation to history
 */
async function persistWorkflow(event: WorkflowEvent): Promise<void> {
  if (event.type !== 'created') return

  const { workflow, workflowId } = event.payload

  // Load existing history
  const history = await storageGet<WorkflowHistoryEntry[]>(STORAGE_KEYS.WORKFLOW_HISTORY) ?? []

  // Add new entry (keep last 50)
  const entry: WorkflowHistoryEntry = {
    id: workflowId ?? `temp-${Date.now()}`,
    name: workflow.name ?? 'Unnamed Workflow',
    createdAt: event.timestamp,
    workflowId: workflowId
  }

  const updatedHistory = [entry, ...history].slice(0, 50)

  // Save to storage
  await storageSet(STORAGE_KEYS.WORKFLOW_HISTORY, updatedHistory)

  // Emit storage event
  emitStorageSave(STORAGE_KEYS.WORKFLOW_HISTORY, updatedHistory)
}

// Observable pipeline: persist workflow created events
const workflowPersistence$ = systemEvents.workflow$.pipe(
  filter(event => event.type === 'created'),
  debounceTime(500), // Debounce to prevent excessive writes
  switchMap(event =>
    persistWorkflow(event)
      .then(() => event)
      .catch(err => {
        emitSubscriberError(err, 'workflow-persistence')
        return null
      })
  ),
  filter(event => event !== null),
  catchError(err => {
    emitSubscriberError(err, 'workflow-persistence')
    return EMPTY
  })
)

/**
 * Start auto-persisting events
 */
export function setup(): void {
  workflowPersistence$
    .pipe(
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('persistence', 'Subscription cleaned up', {}))
    )
    .subscribe(event => {
      if (event && process.env.NODE_ENV === 'development') {
        emitSystemInfo('persistence', 'Persisted workflow', {
          workflowName: event.payload.workflow.name
        })
      }
    })
}

/**
 * Stop persisting and cleanup
 */
export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}

/**
 * Get workflow history from storage
 */
export async function getWorkflowHistory(): Promise<WorkflowHistoryEntry[]> {
  const history = await storageGet<WorkflowHistoryEntry[]>(STORAGE_KEYS.WORKFLOW_HISTORY)
  return history ?? []
}

/**
 * Clear workflow history from storage
 */
export async function clearWorkflowHistory(): Promise<void> {
  await storageSet(STORAGE_KEYS.WORKFLOW_HISTORY, [])
  emitStorageSave(STORAGE_KEYS.WORKFLOW_HISTORY, [])
}

