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

export class SystemEvents
{
  private eventStream$ = new Subject<SystemEvent>()

  /**
   * Create a filtered observable for a specific domain
   *
   * @param domain - Event domain to filter by
   * @returns Observable stream filtered by domain with shareReplay
   */
  private createDomainStream<T extends SystemEvent>(
    domain: T['domain']
  ): Observable<T>
  {
    return this.eventStream$.pipe(
      filter((e): e is T => e.domain === domain),
      shareReplay({ bufferSize: 1, refCount: true })
    )
  }

  /**
   * Filtered observable streams by domain
   *
   * Each stream:
   * - Filters events by domain
   * - Uses shareReplay to prevent duplicate executions
   * - Auto-unsubscribes when no subscribers remain (refCount: true)
   */
  workflow$ = this.createDomainStream<WorkflowEvent>('workflow')
  agent$    = this.createDomainStream<AgentEvent>('agent')
  llm$      = this.createDomainStream<LLMEvent>('llm')
  error$    = this.createDomainStream<ErrorEvent>('error')
  storage$  = this.createDomainStream<StorageEvent>('storage')
  system$   = this.createDomainStream<SystemInfoEvent>('system')

  /**
   * Emit an event to all subscribers
   */
  emit<T extends SystemEvent>(event: T): void
  {
    this.eventStream$.next(event)
  }

  /**
   * Get the raw event stream (for logging/debugging)
   */
  get eventStream(): Observable<SystemEvent>
  {
    return this.eventStream$.asObservable()
  }

  /**
   * Cleanup - complete all streams
   */
  destroy(): void
  {
    this.eventStream$.complete()
  }
}

/**
 * Singleton instance - used throughout the extension
 */
export const systemEvents = new SystemEvents()

