<!-- 0461f845-e254-4f14-b531-a0643fd17613 2c4f24b0-3ef9-4a3a-b1dd-d2739c89e13a -->
# Reactive Architecture Migration Plan (RxJS-based)

## Overview

Transform the extension from procedural (services call UI/logging directly) to reactive (services emit events via helper functions, subscribers react) using **RxJS 7.8.2** as the foundation. This decouples concerns and centralizes cross-cutting logic with powerful reactive operators.

## Why RxJS?

- **Powerful operators**: `debounceTime`, `retry`, `catchError`, `merge`, `filter`, `map`, `shareReplay`, `takeUntil`, `switchMap`
- **Composable streams**: Combine multiple event sources with `merge`, `combineLatest`
- **Built-in error handling**: `catchError`, `retry` operators
- **Time-based operations**: `debounceTime`, `delay`, `timeout`
- **Type-safe**: Excellent TypeScript support with Observable<T> generics
- **Testing**: Rich testing utilities with TestScheduler

## Dependencies

Add to `extension/package.json`:

```json
"dependencies": {
  "rxjs": "^7.8.2"
}
```

## Phase 1: Infrastructure Foundation

### 1.1 Create Event System Core

**File: `extension/src/lib/events/index.ts`**

```typescript
import { Subject, filter, shareReplay } from 'rxjs'
import type { SystemEvent } from './types'

export class SystemEvents {
  private eventStream$ = new Subject<SystemEvent>()
  
  // Filtered observables with shareReplay (critical for performance!)
  workflow$ = this.eventStream$.pipe(
    filter(e => e.domain === 'workflow'),
    shareReplay({ bufferSize: 1, refCount: true })
  )
  
  agent$ = this.eventStream$.pipe(
    filter(e => e.domain === 'agent'),
    shareReplay({ bufferSize: 1, refCount: true })
  )
  
  llm$ = this.eventStream$.pipe(
    filter(e => e.domain === 'llm'),
    shareReplay({ bufferSize: 1, refCount: true })
  )
  
  error$ = this.eventStream$.pipe(
    filter(e => e.domain === 'error'),
    shareReplay({ bufferSize: 1, refCount: true })
  )
  
  emit<T extends SystemEvent>(event: T): void {
    this.eventStream$.next(event)
  }
  
  destroy(): void {
    this.eventStream$.complete()
  }
}

export const systemEvents = new SystemEvents()
```

**File: `extension/src/lib/events/types.ts`**

```typescript
export type SystemEvent = 
  | WorkflowEvent
  | AgentEvent
  | LLMEvent
  | ErrorEvent

export type WorkflowEvent = {
  domain: 'workflow'
  type: 'created' | 'updated' | 'failed'
  payload: { workflowId?: string; workflow: Workflow; error?: Error }
  timestamp: number
}

export type AgentEvent = {
  domain: 'agent'
  type: 'started' | 'completed' | 'tool_started' | 'tool_completed'
  payload: { agent: AgentType; action?: string; tool?: string; metadata?: unknown }
  timestamp: number
}

export type LLMEvent = {
  domain: 'llm'
  type: 'started' | 'completed'
  payload: { model?: string; provider?: string; tokens?: { prompt: number; completion: number } }
  timestamp: number
}

export type ErrorEvent = {
  domain: 'error'
  type: 'api' | 'subscriber' | 'unhandled' | 'llm'
  payload: {
    error: Error
    source: string
    context?: unknown
    userMessage?: string
  }
  timestamp: number
}
```

**File: `extension/src/lib/events/emitters.ts`**

Helper functions that encapsulate event creation logic:

```typescript
import { systemEvents } from './index'
import type { Workflow, AgentType } from '../types'

// Workflow emitters
export function emitWorkflowCreated(workflow: Workflow, workflowId?: string): void {
  systemEvents.emit({
    domain: 'workflow',
    type: 'created',
    payload: { workflow, workflowId },
    timestamp: Date.now()
  })
}

export function emitWorkflowFailed(workflow: Workflow, error: Error): void {
  systemEvents.emit({
    domain: 'workflow',
    type: 'failed',
    payload: { workflow, error },
    timestamp: Date.now()
  })
}

// Agent emitters
export function emitAgentStarted(agent: AgentType, action: string): void {
  systemEvents.emit({
    domain: 'agent',
    type: 'started',
    payload: { agent, action },
    timestamp: Date.now()
  })
}

export function emitAgentCompleted(agent: AgentType): void {
  systemEvents.emit({
    domain: 'agent',
    type: 'completed',
    payload: { agent },
    timestamp: Date.now()
  })
}

// Error emitters
export function emitApiError(error: unknown, source: string, context?: unknown): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  systemEvents.emit({
    domain: 'error',
    type: 'api',
    payload: {
      error: errorObj,
      source,
      context,
      userMessage: `API error in ${source}: ${errorObj.message}`
    },
    timestamp: Date.now()
  })
}

export function emitUnhandledError(error: unknown, source: string): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  systemEvents.emit({
    domain: 'error',
    type: 'unhandled',
    payload: {
      error: errorObj,
      source,
      userMessage: 'An unexpected error occurred'
    },
    timestamp: Date.now()
  })
}

export function emitSubscriberError(error: unknown, subscriberName: string): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  systemEvents.emit({
    domain: 'error',
    type: 'subscriber',
    payload: {
      error: errorObj,
      source: subscriberName,
      userMessage: `${subscriberName} encountered an error`
    },
    timestamp: Date.now()
  })
}
```

### 1.2 Subscriber Pattern

**Pattern: Observable Pipelines + `takeUntil()` + `setup()`/`cleanup()`**

All subscribers follow this structure:

```typescript
import { Subject } from 'rxjs'
import { takeUntil, finalize } from 'rxjs/operators'

// Destroy signal
const destroy$ = new Subject<void>()

// Define observable pipelines
const myObservable$ = systemEvents.workflow$.pipe(
  map(...),
  catchError(...)
)

export function setup(): void {
  myObservable$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[module] Cleaned up'))
    )
    .subscribe(...)
}

export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}
```

### 1.3 LangGraph Event Bridge

**File: `extension/src/lib/events/langchain-bridge.ts`**

```typescript
import { from } from 'rxjs'
import { tap, filter, takeUntil, finalize } from 'rxjs/operators'
import { systemEvents } from './index'
import { emitAgentStarted, emitAgentCompleted } from './emitters'
import type { StreamEvent } from '@langchain/core/tracers/log_stream'

export function bridgeLangGraphEvents(eventStream: AsyncGenerator<StreamEvent>) {
  return from(eventStream).pipe(
    filter(({ event }) => 
      event === 'on_llm_start' || 
      event === 'on_llm_end' ||
      event === 'on_tool_start' ||
      event === 'on_tool_end' ||
      event === 'on_chain_start' ||
      event === 'on_chain_end'
    ),
    tap(({ event, name, data, metadata }) => {
      switch (event) {
        case 'on_llm_start':
          systemEvents.emit({
            domain: 'llm',
            type: 'started',
            payload: { model: metadata?.ls_model_name, provider: metadata?.ls_provider },
            timestamp: Date.now()
          })
          break
          
        case 'on_llm_end':
          systemEvents.emit({
            domain: 'llm',
            type: 'completed',
            payload: { tokens: data?.output?.usage_metadata },
            timestamp: Date.now()
          })
          break
          
        case 'on_chain_start':
          if (name?.includes('planner')) {
            emitAgentStarted('planner', 'planning')
          } else if (name?.includes('executor')) {
            emitAgentStarted('executor', 'executing')
          }
          break
          
        case 'on_chain_end':
          if (name?.includes('planner')) {
            emitAgentCompleted('planner')
          } else if (name?.includes('executor')) {
            emitAgentCompleted('executor')
          }
          break
      }
    })
  )
}
```

### 1.4 Integration Setup

**Update: `extension/src/background/index.ts`**

```typescript
import { systemEvents } from '../lib/events'
import * as logger from '../lib/events/subscribers/logger'
import * as chat from '../lib/events/subscribers/chat'
import * as activity from '../lib/events/subscribers/activity'
import * as persistence from '../lib/events/subscribers/persistence'
import { emitUnhandledError } from '../lib/events/emitters'

// Initialize subscribers
logger.setup()
chat.setup()
activity.setup()
persistence.setup()

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  emitUnhandledError(event.reason, 'unhandledrejection')
})

// Cleanup on shutdown
chrome.runtime.onSuspend.addListener(() => {
  logger.cleanup()
  chat.cleanup()
  activity.cleanup()
  persistence.cleanup()
  systemEvents.destroy()
})
```

## Phase 2: Subscriber Implementations

All subscribers use **`takeUntil()` pattern** for cleanup.

### 2.1 Logger Subscriber

**File: `extension/src/lib/events/subscribers/logger.ts`**

```typescript
import { Subject } from 'rxjs'
import { takeUntil, tap, finalize } from 'rxjs/operators'
import { systemEvents } from '../index'
import { debug } from '../../utils/debug'

const destroy$ = new Subject<void>()

const logEvents$ = systemEvents.eventStream$.pipe(
  tap(event => {
    debug({
      component: event.domain,
      action: event.type,
      data: event.payload,
      error: event.domain === 'error' ? event.payload.error : undefined
    })
  })
)

export function setup(): void {
  logEvents$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[logger] Cleaned up'))
    )
    .subscribe()
}

export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}
```

### 2.2 Chat Subscriber

**File: `extension/src/lib/events/subscribers/chat.ts`**

```typescript
import { Subject } from 'rxjs'
import { filter, map, catchError, takeUntil, finalize } from 'rxjs/operators'
import { EMPTY } from 'rxjs'
import { systemEvents } from '../index'
import { useChatStore } from '../../state/chatStore'
import { generateId } from '../../utils/id'
import { emitSubscriberError } from '../emitters'

const destroy$ = new Subject<void>()

const workflowMessages$ = systemEvents.workflow$.pipe(
  filter(e => e.type === 'created'),
  map(e => ({
    id: generateId(),
    role: 'assistant' as const,
    text: `✅ Workflow "${e.payload.workflow.name}" created!`
  })),
  catchError(err => {
    emitSubscriberError(err, 'chat-workflow')
    return EMPTY
  })
)

const errorMessages$ = systemEvents.error$.pipe(
  map(e => ({
    id: generateId(),
    role: 'error' as const,
    text: e.payload.userMessage || `❌ ${e.payload.error.message}`,
    error: { title: 'Error', details: e.payload.error.message }
  })),
  catchError(err => {
    emitSubscriberError(err, 'chat-error')
    return EMPTY
  })
)

export function setup(): void {
  workflowMessages$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[chat-workflow] Cleaned up'))
    )
    .subscribe(msg => useChatStore.getState().addMessage(msg))
  
  errorMessages$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[chat-error] Cleaned up'))
    )
    .subscribe(msg => useChatStore.getState().addMessage(msg))
}

export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}
```

### 2.3 Activity Subscriber

**File: `extension/src/lib/events/subscribers/activity.ts`**

```typescript
import { Subject, merge } from 'rxjs'
import { map, debounceTime, delay, filter, catchError, takeUntil, finalize } from 'rxjs/operators'
import { EMPTY } from 'rxjs'
import { systemEvents } from '../index'
import { useChatStore } from '../../state/chatStore'
import { emitSubscriberError } from '../emitters'

const destroy$ = new Subject<void>()

const activityUpdates$ = merge(systemEvents.agent$, systemEvents.llm$).pipe(
  map(e => ({
    id: `${e.domain}-${e.timestamp}`,
    agent: e.payload.agent,
    activity: e.type,
    status: e.type as 'started' | 'working' | 'complete',
    timestamp: e.timestamp
  })),
  debounceTime(50),
  catchError(err => {
    emitSubscriberError(err, 'activity-updates')
    return EMPTY
  })
)

const activityCleanup$ = systemEvents.agent$.pipe(
  filter(e => e.type === 'completed'),
  delay(3000),
  map(e => `${e.domain}-${e.timestamp}`)
)

export function setup(): void {
  activityUpdates$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[activity-updates] Cleaned up'))
    )
    .subscribe(activity => useChatStore.getState().addActivity(activity))
  
  activityCleanup$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[activity-cleanup] Cleaned up'))
    )
    .subscribe(id => useChatStore.getState().removeActivity(id))
}

export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}
```

### 2.4 Persistence Subscriber

**File: `extension/src/lib/events/subscribers/persistence.ts`**

Uses `switchMap` for async operations (NOT async in subscribe!):

```typescript
import { Subject, merge } from 'rxjs'
import { filter, debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil, finalize } from 'rxjs/operators'
import { EMPTY } from 'rxjs'
import { systemEvents } from '../index'
import { storageSet } from '../../utils/storage'
import { STORAGE_KEYS } from '../../constants'
import { emitSubscriberError } from '../emitters'

const destroy$ = new Subject<void>()

const persistableEvents$ = merge(
  systemEvents.workflow$.pipe(filter(e => e.type === 'created'))
).pipe(
  debounceTime(1000),
  distinctUntilChanged(),
  switchMap(async (event) => {
    if (event.domain === 'workflow') {
      await storageSet(STORAGE_KEYS.LAST_WORKFLOW, event.payload.workflow)
    }
    return event
  }),
  catchError(err => {
    emitSubscriberError(err, 'persistence')
    return EMPTY
  })
)

export function setup(): void {
  persistableEvents$
    .pipe(
      takeUntil(destroy$),
      finalize(() => console.log('[persistence] Cleaned up'))
    )
    .subscribe()
}

export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}
```

### 2.5 Tracing Subscriber

**File: `extension/src/lib/events/subscribers/tracing.ts`**

```typescript
import { Subject, merge } from 'rxjs'
import { scan, tap, takeUntil, finalize } from 'rxjs/operators'
import { systemEvents } from '../index'
import type { AgentTrace } from '../types'

const destroy$ = new Subject<void>()
const traces = new Map<string, AgentTrace>()

const traceUpdates$ = merge(systemEvents.agent$, systemEvents.llm$).pipe(
  scan((accTraces, event) => {
    const sessionId = event.payload.sessionId || 'default'
    const trace = accTraces.get(sessionId) || {
      sessionId,
      events: [],
      startTime: Date.now()
    }
    
    trace.events.push(event)
    accTraces.set(sessionId, trace)
    return accTraces
  }, new Map<string, AgentTrace>()),
  tap(updatedTraces => {
    traces.clear()
    updatedTraces.forEach((v, k) => traces.set(k, v))
  })
)

export function setup(): void {
  traceUpdates$
    .pipe(
      takeUntil(destroy$),
      finalize(() => {
        console.log('[tracing] Cleaned up')
        traces.clear()
      })
    )
    .subscribe()
}

export function getTrace(sessionId: string): AgentTrace | undefined {
  return traces.get(sessionId)
}

export function cleanup(): void {
  destroy$.next()
  destroy$.complete()
}
```

## Phase 3: Feature Refactoring

### 3.1 Refactor ChatService

**Update: `extension/src/lib/services/chat.ts`**

Replace direct store calls with helper function calls:

```typescript
import { emitApiError, emitWorkflowCreated } from '../events/emitters'

// Before (216 lines, mixed concerns)
private handleError(message) {
  const { addMessage } = useChatStore.getState()
  const errorDetails = this.getErrorTitle(...)
  addMessage({ role: 'error', text: ..., error: errorDetails })
}

// After (~80 lines, pure)
private handleError(message) {
  emitApiError(message.error, 'chat-service')
}
```

### 3.2 Refactor Background Script

**Update: `extension/src/background/index.ts`**

Replace manual emission with helper functions:

```typescript
import { emitWorkflowCreated, emitWorkflowFailed } from '../lib/events/emitters'

// Before
systemEvents.emit({
  domain: 'workflow',
  type: 'created',
  payload: { workflow, workflowId: id },
  timestamp: Date.now()
})

// After  
emitWorkflowCreated(workflow, id)
```

### 3.3 Refactor Orchestrator

**Update: `extension/src/lib/orchestrator/index.ts`**

Use LangGraph bridge instead of manual emission:

```typescript
import { bridgeLangGraphEvents } from '../events/langchain-bridge'

export class ChatOrchestrator {
  public async plan(input: OrchestratorInput): Promise<Plan> {
    const config = { /* ... */ }
    
    // Stream events from LangGraph
    const eventStream = workflowGraph.streamEvents(
      { mode: 'workflow', messages: this.convertMessages(input.messages) },
      { ...config, version: 'v2' }
    )
    
    // Bridge to our event system
    const eventSub = bridgeLangGraphEvents(eventStream).subscribe()
    
    // Run graph
    const result = await workflowGraph.invoke(
      { mode: 'workflow', messages: this.convertMessages(input.messages) },
      config
    )
    
    eventSub.unsubscribe()
    return result.plan
  }
}
```

## Phase 4: Testing

**File: `extension/src/lib/events/__tests__/system-events.test.ts`**

```typescript
import { TestScheduler } from 'rxjs/testing'
import { systemEvents } from '../index'

describe('SystemEvents', () => {
  let scheduler: TestScheduler
  
  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })
  
  it('should filter events by domain', () => {
    scheduler.run(({ cold, expectObservable }) => {
      // Marble testing
    })
  })
})
```

## Implementation Order

1. Phase 1 - Infrastructure (event system, emitters, LangGraph bridge)
2. Phase 2.1 - Logger subscriber
3. Phase 2.2 - Chat subscriber  
4. Phase 2.3 - Activity subscriber
5. Phase 2.4 - Persistence subscriber
6. Phase 2.5 - Tracing subscriber
7. Phase 3 - Refactor services to use emitter helpers
8. Phase 4 - Testing

## Files Created

- `extension/src/lib/events/index.ts` - Event system core
- `extension/src/lib/events/types.ts` - Event type definitions
- `extension/src/lib/events/emitters.ts` - Helper functions
- `extension/src/lib/events/langchain-bridge.ts` - LangGraph integration
- `extension/src/lib/events/subscribers/logger.ts`
- `extension/src/lib/events/subscribers/chat.ts`
- `extension/src/lib/events/subscribers/activity.ts`
- `extension/src/lib/events/subscribers/persistence.ts`
- `extension/src/lib/events/subscribers/tracing.ts`
- `extension/src/lib/events/__tests__/` - Test files

## Files Refactored

- `extension/package.json` - Add RxJS dependency
- `extension/src/background/index.ts` - Use emitter helpers
- `extension/src/lib/services/chat.ts` - Use emitter helpers
- `extension/src/lib/orchestrator/index.ts` - Use LangGraph bridge
- All files with direct `debug()` calls

### To-dos

- [ ] Create event system core (SystemEvents, types, constants, subscriber base)
- [ ] Implement LoggerSubscriber and remove scattered debug() calls
- [ ] Implement ChatSubscriber and refactor ChatService to emit events
- [ ] Implement ActivitySubscriber and replace manual narrator system
- [ ] Implement PersistenceSubscriber for auto-save functionality
- [ ] Implement TracingSubscriber to replace AgentTracingCallback
- [ ] Implement ErrorSubscriber to centralize error handling
- [ ] Refactor background script to emit events instead of direct calls
- [ ] Refactor orchestrator and nodes to emit events
- [ ] Refactor all services to emit events instead of store manipulation
- [ ] Create tests and validate migration completeness
- [ ] Create architecture decision document for reactive event system