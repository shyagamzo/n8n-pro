# Reactive Event System

Reactive, event-driven architecture using RxJS 7.8.2 for decoupled, extensible code.

## Quick Start

### Emitting Events

Use helper functions instead of calling `systemEvents.emit()` directly:

```typescript
import { emitWorkflowCreated, emitApiError } from './events/emitters'

// Success
async function createWorkflow(data) {
  try {
    const workflow = await api.create(data)
    emitWorkflowCreated(workflow, workflow.id)
  } catch (error) {
    emitApiError(error, 'createWorkflow', { data })
  }
}
```

### Subscribing to Events

Events are handled by subscribers - you typically don't need to subscribe manually.

```typescript
// Logger subscriber automatically logs all events
// Chat subscriber automatically transforms events → messages
// Activity subscriber automatically tracks agent operations
```

## Architecture

```
Services/Modules
   ↓ emit events via helper functions
SystemEvents (RxJS Subject)
   ↓ filtered streams (workflow$, agent$, error$, llm$)
Subscribers
   ↓ react to events
Side Effects (logging, storage, UI updates via messaging)
```

## Event Types

All events have this structure:
```typescript
{
  domain: 'workflow' | 'agent' | 'llm' | 'error' | 'storage'
  type: string  // e.g., 'created', 'started', 'api'
  payload: { ... } // Event-specific data
  timestamp: number
}
```

### Workflow Events

```typescript
emitWorkflowCreated(workflow, workflowId)
emitWorkflowUpdated(workflow, workflowId)
emitWorkflowValidated(workflow)
emitWorkflowFailed(workflow, error)
```

### Agent Events

```typescript
emitAgentStarted(agent, action, metadata)
emitAgentCompleted(agent, metadata)
emitAgentHandoff(fromAgent, toAgent, reason)
emitToolStarted(agent, tool, metadata)
emitToolCompleted(agent, tool, metadata)
```

### LLM Events

```typescript
emitLLMStarted(model, provider, runId)
emitLLMCompleted(tokens, runId)
```

### Error Events

```typescript
emitApiError(error, source, context)
emitUnhandledError(error, source)
emitSubscriberError(error, subscriberName)
emitValidationError(error, source, context)
emitSystemError(error, source)
```

## Subscribers

### Active Subscribers (Background Worker)

1. **Logger** (`subscribers/logger.ts`)
   - Logs ALL events using debug utility
   - Runs in background context

2. **Tracing** (`subscribers/tracing.ts`)
   - Accumulates events into traces for debugging
   - Provides `getTrace(sessionId)` for inspection
   - Runs in background context

3. **Persistence** (`subscribers/persistence.ts`)
   - Auto-saves important events to chrome.storage
   - Uses debouncing to prevent excessive writes
   - Runs in background context

### Inactive Subscribers (Wrong Context)

4. **Chat** (`subscribers/chat.ts`)
   - Would transform events → chat messages
   - Currently NOT ACTIVE (wrong context - needs content script)
   - UI updates still use chrome.runtime messaging

5. **Activity** (`subscribers/activity.ts`)
   - Would track agent activities
   - Currently NOT ACTIVE (wrong context - needs content script)
   - Activities still sent via chrome.runtime messaging

## Chrome Extension Context Issue

**Background Worker** and **Content Script** have **separate JavaScript contexts**.

State (like chatStore) in one context is NOT accessible from the other.

**Current Solution:**
- Events run in background (logger, tracing work fine)
- UI updates use chrome.runtime.postMessage to content script
- Content script's ChatService receives messages and updates its chatStore

**Future Solution:**
- Forward events from background → content script via chrome.runtime messaging
- Content script has its own SystemEvents instance
- Chat/Activity subscribers run in content script
- Complete event-driven architecture across contexts

## LangGraph Integration

The `langchain-bridge.ts` automatically converts LangGraph events to SystemEvents:

```typescript
import { bridgeLangGraphEvents } from './events/langchain-bridge'

// In orchestrator
const eventStream = workflowGraph.streamEvents(input, config)
const eventSub = bridgeLangGraphEvents(eventStream).subscribe()

// Events automatically emitted for:
// - on_llm_start → emitLLMStarted()
// - on_llm_end → emitLLMCompleted()
// - on_chain_start → emitAgentStarted()
// - on_chain_end → emitAgentCompleted()
// - on_tool_start/end → agent tool events
```

## RxJS Patterns Used

- **`shareReplay()`** - Share single execution across subscribers
- **`takeUntil()`** - Clean subscription management
- **`switchMap()`** - Handle async operations
- **`merge()`** - Combine multiple streams
- **`debounceTime()`** - Throttle rapid events
- **`delay()`** - Delayed operations
- **`scan()`** - Accumulate state over time
- **`catchError()`** - Handle errors in streams
- **`finalize()`** - Cleanup when stream completes

## Testing

See `__tests__/` directory for RxJS marble tests.

## Files

- `index.ts` - SystemEvents class (core event bus)
- `types.ts` - Event type definitions
- `emitters.ts` - Helper functions for emitting events
- `langchain-bridge.ts` - LangGraph integration
- `subscribers/` - Event subscribers
  - `logger.ts` - Logging
  - `tracing.ts` - Debug tracing
  - `persistence.ts` - Auto-save
  - `chat.ts` - UI updates (inactive - context issue)
  - `activity.ts` - Activity tracking (inactive - context issue)
  - `messaging.ts` - Event → message bridge (future)

## See Also

- [Architecture Decision](/.cursor/rules/decisions/n8n-extension/architecture/0036-reactive-rxjs-architecture.mdc)
- [Migration Status](/REACTIVE-MIGRATION-STATUS.md)
- [Context Fix Guide](/ARCHITECTURE-CONTEXT-FIX.md)

