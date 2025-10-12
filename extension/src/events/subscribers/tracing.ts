/**
 * Tracing Subscriber
 *
 * Accumulates agent and LLM events into traces for debugging and analysis.
 * Builds session-based traces using RxJS scan operator.
 */

import { Subject, merge } from 'rxjs'
import { scan, tap, takeUntil, finalize } from 'rxjs/operators'
import { systemEvents, emitSystemInfo } from '@events/index'
import type { SystemEvent, AgentTrace } from '@events/types'

// ==========================================
// Constants
// ==========================================

const DEFAULT_SESSION_ID = 'default'

// ==========================================
// State Management
// ==========================================

const destroy$ = new Subject<void>()
const traces = new Map<string, AgentTrace>()

// ==========================================
// Helper Functions
// ==========================================

/**
 * Extract session ID from event payload
 */
function getSessionId(event: SystemEvent): string
{
  if ('sessionId' in event.payload && event.payload.sessionId)
  {
    return event.payload.sessionId as string
  }

  return DEFAULT_SESSION_ID
}

/**
 * Get or create a trace for the given session
 */
function getOrCreateTrace(
  traces: Map<string, AgentTrace>,
  sessionId: string
): AgentTrace
{
  const existingTrace = traces.get(sessionId)

  if (existingTrace)
  {
    return existingTrace
  }

  const newTrace: AgentTrace = {
    sessionId,
    events: [],
    startTime: Date.now()
  }

  traces.set(sessionId, newTrace)

  return newTrace
}

/**
 * Accumulate event into trace
 */
function accumulateEvent(
  traces: Map<string, AgentTrace>,
  event: SystemEvent
): Map<string, AgentTrace>
{
  const sessionId = getSessionId(event)
  const trace = getOrCreateTrace(traces, sessionId)

  trace.events.push(event)

  return traces
}

/**
 * Sync accumulated traces to module-level state
 */
function syncTraces(updatedTraces: Map<string, AgentTrace>): void
{
  traces.clear()

  updatedTraces.forEach((trace, sessionId) =>
  {
    traces.set(sessionId, trace)
  })
}

// ==========================================
// Observable Pipeline
// ==========================================

/**
 * Trace updates stream
 * Accumulates agent and LLM events into session-based traces
 */
const traceUpdates$ = merge(
  systemEvents.agent$,
  systemEvents.llm$
).pipe(
  scan(accumulateEvent, new Map<string, AgentTrace>()),
  tap(syncTraces)
)

// ==========================================
// Public API
// ==========================================

/**
 * Start tracing events
 *
 * Subscribes to agent and LLM events and accumulates them into session traces.
 * Call cleanup() when done to prevent memory leaks.
 */
export function setup(): void
{
  traceUpdates$
    .pipe(
      takeUntil(destroy$),
      finalize(() =>
      {
        emitSystemInfo('tracing', 'Subscription cleaned up', {})
        traces.clear()
      })
    )
    .subscribe()
}

/**
 * Get trace for a specific session
 *
 * @param sessionId - Session identifier
 * @returns Trace for the session, or undefined if not found
 */
export function getTrace(sessionId: string): AgentTrace | undefined
{
  return traces.get(sessionId)
}

/**
 * Get all traces
 *
 * @returns Copy of all traces (immutable)
 */
export function getAllTraces(): Map<string, AgentTrace>
{
  return new Map(traces)
}

/**
 * Stop tracing and cleanup
 *
 * Completes the destroy$ subject and clears all traces.
 * Should be called when shutting down the extension.
 */
export function cleanup(): void
{
  destroy$.next()
  destroy$.complete()
}

