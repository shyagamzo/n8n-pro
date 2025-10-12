/**
 * Reactive event system core using RxJS
 *
 * Central event bus that all modules emit to and subscribe from.
 * Uses Subject for event emission and provides pre-filtered observables
 * with shareReplay to prevent duplicate executions.
 */

import { Subject, filter, shareReplay } from 'rxjs'
import type { Observable } from 'rxjs'
import type { SystemEvent, WorkflowEvent, AgentEvent, LLMEvent, ErrorEvent, StorageEvent, SystemInfoEvent } from './types'

export class SystemEvents {
  private eventStream$ = new Subject<SystemEvent>()

  /**
   * Filtered observable streams by domain
   * shareReplay ensures single execution shared by all subscribers
   * refCount: true auto-unsubscribes when no subscribers remain
   */
  workflow$: Observable<WorkflowEvent> = this.eventStream$.pipe(
    filter((e): e is WorkflowEvent => e.domain === 'workflow'),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  agent$: Observable<AgentEvent> = this.eventStream$.pipe(
    filter((e): e is AgentEvent => e.domain === 'agent'),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  llm$: Observable<LLMEvent> = this.eventStream$.pipe(
    filter((e): e is LLMEvent => e.domain === 'llm'),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  error$: Observable<ErrorEvent> = this.eventStream$.pipe(
    filter((e): e is ErrorEvent => e.domain === 'error'),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  storage$: Observable<StorageEvent> = this.eventStream$.pipe(
    filter((e): e is StorageEvent => e.domain === 'storage'),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  system$: Observable<SystemInfoEvent> = this.eventStream$.pipe(
    filter((e): e is SystemInfoEvent => e.domain === 'system'),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  /**
   * Emit an event to all subscribers
   */
  emit<T extends SystemEvent>(event: T): void {
    this.eventStream$.next(event)
  }

  /**
   * Get the raw event stream (for logging/debugging)
   */
  get eventStream(): Observable<SystemEvent> {
    return this.eventStream$.asObservable()
  }

  /**
   * Cleanup - complete all streams
   */
  destroy(): void {
    this.eventStream$.complete()
  }
}

/**
 * Singleton instance - used throughout the extension
 */
export const systemEvents = new SystemEvents()

// Re-export types and emitters for convenience
export type * from './types'
export * from './emitters'

