/**
 * Tracing Subscriber
 * 
 * Accumulates agent and LLM events into traces for debugging.
 * Uses the scan operator to build trace state over time.
 */

import { Subject, merge } from 'rxjs'
import { scan, tap, takeUntil, finalize } from 'rxjs/operators'
import { systemEvents } from '../index'
import type { AgentTrace } from '../types'

const destroy$ = new Subject<void>()
const traces = new Map<string, AgentTrace>()

// Observable pipeline: accumulate traces using scan
const traceUpdates$ = merge(systemEvents.agent$, systemEvents.llm$).pipe(
  scan((accTraces, event) => {
    // Extract session ID from event payload
    const sessionId = ('sessionId' in event.payload && event.payload.sessionId) || 'default'
    
    // Get or create trace for this session
    const trace = accTraces.get(sessionId as string) || {
      sessionId: sessionId as string,
      events: [],
      startTime: Date.now()
    }
    
    // Add event to trace
    trace.events.push(event)
    accTraces.set(sessionId as string, trace)
    
    return accTraces
  }, new Map<string, AgentTrace>()),
  tap(updatedTraces => {
    // Update module-level traces map
    traces.clear()
    updatedTraces.forEach((v, k) => traces.set(k, v))
  })
)

/**
 * Start tracing events
 */
export function setup(): void {
  traceUpdates$
    .pipe(
      takeUntil(destroy$),
      finalize(() => {
        console.log('[tracing] Subscription cleaned up')
        traces.clear()
      })
    )
    .subscribe()
}

/**
 * Get trace for a specific session
 */
export function getTrace(sessionId: string): AgentTrace | undefined {
  return traces.get(sessionId)
}

/**
 * Get all traces
 */
export function getAllTraces(): Map<string, AgentTrace> {
  return new Map(traces)
}

/**
 * Stop tracing and cleanup
 */
export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}

