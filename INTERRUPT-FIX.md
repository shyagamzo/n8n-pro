# LangGraph interrupt() Browser Fix

## Problem

When using `interrupt()` in LangGraph nodes within a browser extension, the error occurred:

```
Called interrupt() outside the context of a graph.
```

## Root Cause

LangGraph's `interrupt()` function requires `AsyncLocalStorage` to track execution context. From the source code:

```javascript
const config = AsyncLocalStorageProviderSingleton.getRunnableConfig();
if (!config) {
    throw new Error("Called interrupt() outside the context of a graph.");
}
```

**The issue**: 
- In Node.js, LangGraph auto-initializes `AsyncLocalStorageProviderSingleton`
- In browser, Node.js `async_hooks` module doesn't exist
- We aliased it to a stub, but the stub wasn't properly initialized
- The stub returned `undefined` from `getStore()`, causing the error

## Solution

### 1. Implement Working AsyncLocalStorage Polyfill

**File**: `extension/src/lib/stubs/async_hooks.ts`

Created a browser-compatible `AsyncLocalStorage` polyfill that:
- Maintains a `currentStore` variable to track context
- Implements `run()` to set context for callback execution
- Handles both synchronous and asynchronous callbacks
- Preserves context through Promise chains

Key implementation:
```typescript
export class AsyncLocalStorage<T = any> {
  private currentStore: T | undefined = undefined

  getStore(): T | undefined {
    return this.currentStore  // Now returns actual value!
  }

  run<R>(store: T, callback: () => R): R {
    const previousStore = this.currentStore
    this.currentStore = store

    try {
      const result = callback()
      
      // Maintain context through Promise chain
      if (result instanceof Promise) {
        return result.finally(() => {
          this.currentStore = previousStore
        }) as unknown as R
      }
      
      this.currentStore = previousStore
      return result
    } catch (error) {
      this.currentStore = previousStore
      throw error
    }
  }
}
```

### 2. Initialize AsyncLocalStorage Singleton

**File**: `extension/src/lib/orchestrator/graph.ts`

Manually initialize the global AsyncLocalStorage singleton before creating the graph:

```typescript
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons'
import { AsyncLocalStorage } from 'node:async_hooks'

// Initialize for browser environment
AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new AsyncLocalStorage())
```

This makes our polyfill available to LangGraph's `interrupt()` function.

### 3. Handle GraphInterrupt Errors

**File**: `extension/src/background/index.ts`

Catch `GraphInterrupt`/`NodeInterrupt` errors and extract interrupt data:

```typescript
try {
  const reply = await orchestrator.handle(...)
} catch (error) {
  const err = error as any
  
  // Check if this is an interrupt for clarification
  if (err?.name === 'NodeInterrupt' || err?.name === 'GraphInterrupt') {
    const interruptData = err.interrupts?.[0]?.value
    
    if (interruptData?.question) {
      // Post clarification question to UI
      post({
        type: 'needs_input',
        question: interruptData.question,
        reason: interruptData.reason
      })
      return  // Don't send 'done' - waiting for user response
    }
  }
  
  throw error  // Not an interrupt, rethrow
}
```

### 4. Resume from Interrupts

**File**: `extension/src/lib/orchestrator/index.ts`

Updated `handle()` to accept a `resumeValue` parameter:

```typescript
public async handle(
  input: OrchestratorInput | null,
  onToken?: StreamTokenHandler,
  resumeValue?: string
): Promise<string> {
  let graphInput: any

  if (resumeValue !== undefined) {
    // Resume from interrupt with user's answer
    graphInput = new Command({ resume: resumeValue })
  } else if (input) {
    // New message
    graphInput = { mode: 'chat', messages: [...] }
  } else {
    // Continue from checkpoint
    graphInput = null
  }

  const result = await workflowGraph.invoke(graphInput, config)
  return result.messages[result.messages.length - 1].content
}
```

### 5. Add Message Types

**File**: `extension/src/lib/types/messaging.ts`

Added message types for interrupt handling:

```typescript
export type ChatRequest = 
  | { type: 'chat'; messages: ChatMessage[] }
  | { type: 'resume_chat'; resumeValue: string; apiKey: string }

export type BackgroundMessage =
  | { type: 'needs_input'; question: string; reason: string }
  // ... other types
```

### 6. Handle Resume in Background Script

```typescript
async function handleChat(msg: ChatRequest, post, sessionId) {
  // Handle resume from interrupt
  if (msg.type === 'resume_chat') {
    const orchestrator = getOrchestrator(sessionId)
    
    const reply = await orchestrator.handle(
      null,  // null input = resume
      (token) => post({ type: 'token', token }),
      msg.resumeValue  // User's answer
    )
    
    post({ type: 'token', token: reply })
    post({ type: 'done' })
    return
  }
  
  // Handle normal chat...
}
```

## How It Works

1. **User sends message** → Graph invokes enrichment node
2. **Enrichment node** calls `interrupt({ question: "..." })`
3. **interrupt()** checks `AsyncLocalStorage.getStore()` → **now returns config ✓**
4. **interrupt()** throws `GraphInterrupt` with question data
5. **Background script** catches interrupt, extracts question
6. **UI** shows clarification prompt to user
7. **User provides answer** → Send `{ type: 'resume_chat', resumeValue: answer }`
8. **Background script** calls `handle(null, onToken, answer)`
9. **Orchestrator** invokes graph with `new Command({ resume: answer })`
10. **interrupt()** returns the resume value, enrichment continues

## Limitations

Our `AsyncLocalStorage` polyfill has limitations compared to Node.js:

- ❌ Does **not** track context across true async boundaries (setTimeout, setInterval, etc.)
- ❌ Does **not** work with multiple concurrent async operations
- ✅ **Does** work for LangGraph's use case (sequential node execution)
- ✅ **Does** maintain context through Promise chains within callbacks

This is acceptable because:
- LangGraph nodes execute sequentially within the graph
- Each invocation completes before the next one starts
- We're not mixing graph execution with other async operations

## Testing

To test the fix:

1. Load extension and open chat
2. Send a vague message: "help me with email"
3. Enrichment should ask clarification question
4. UI should show input prompt (not error)
5. Provide answer: "send daily reports"
6. Enrichment should continue with the answer

## Alternative Approaches Considered

### ❌ Option A: Don't Use interrupt()
Use `interruptBefore` for enrichment instead:
```typescript
interruptBefore: ['enrichment']
```

**Rejected because**:
- Less granular control (pauses before every enrichment call)
- Can't conditionally interrupt (would pause even when no question needed)
- Requires checking state externally to determine if question should be asked

### ❌ Option B: Third-Party AsyncLocalStorage Polyfill
Use `async-local-storage` npm package.

**Rejected because**:
- Adds external dependency
- May not be maintained for browsers
- Our simple polyfill is sufficient for LangGraph's needs

### ✅ Option C: Custom Polyfill + Manual Initialization
Our solution - provides exactly what LangGraph needs without over-engineering.

## References

- LangGraph source: `node_modules/@langchain/langgraph/dist/interrupt.js`
- AsyncLocalStorage initialization: `node_modules/@langchain/langgraph/dist/setup/async_local_storage.js`
- interrupt() documentation: `node_modules/@langchain/langgraph/dist/interrupt.d.ts`

