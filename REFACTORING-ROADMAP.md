# Code Organization Refactoring Roadmap

This document provides detailed implementation plans for the remaining refactoring tasks.

---

## Table of Contents

1. [Phase 1: Logger Subscriber Refactoring](#phase-1-logger-subscriber-refactoring)
2. [Phase 1: ChatService Utilities Extraction](#phase-1-chatservice-utilities-extraction)
3. [Phase 2: React Accessibility Hooks](#phase-2-react-accessibility-hooks)
4. [Phase 2: Loom Parser Split](#phase-2-loom-parser-split)
5. [Phase 3: Additional Enhancements](#phase-3-additional-enhancements)

---

## Phase 1: Logger Subscriber Refactoring

### File: `/extension/src/events/subscribers/logger.ts` (324 lines)

### Problem

8 separate `log*Event()` functions with nearly identical structure:
- `logWorkflowEvent()` (15 lines)
- `logAgentEvent()` (15 lines)
- `logGraphEvent()` (14 lines)
- `logLLMEvent()` (15 lines)
- `logErrorEvent()` (20 lines)
- `logStorageEvent()` (13 lines)
- `logSystemInfoEvent()` (23 lines)
- `logStateTransitionEvent()` (18 lines)

All follow same pattern:
```typescript
function logXEvent(event: XEvent): void {
  logEventWithPayload(
    event,
    color,
    collapsed,
    extractDetails,
    logContent
  )
}
```

### Solution

**1. Create Event Formatter Registry** (data-driven approach):

```typescript
// /extension/src/events/subscribers/logger.ts

type EventFormatter = {
  color: string
  collapsed: boolean
  extractDetails: (payload: any) => string[]
  logContent?: (payload: any) => void
}

const EVENT_FORMATTERS: Record<SystemEvent['domain'], EventFormatter> = {
  workflow: {
    color: '#6366f1',
    collapsed: true,
    extractDetails: (p) => {
      const details: string[] = []
      if (p.workflow?.name) details.push(`"${p.workflow.name}"`)
      if (p.workflowId) details.push(`id: ${p.workflowId}`)
      return details
    }
  },

  agent: {
    color: '#8b5cf6',
    collapsed: true,
    extractDetails: (p) => {
      const details: string[] = []
      if (p.agent) details.push(p.agent)
      if (p.action) details.push(p.action)
      if (p.tool) details.push(`tool: ${p.tool}`)
      return details
    }
  },

  graph: {
    color: '#10b981',
    collapsed: true,
    extractDetails: (p) => {
      const details: string[] = []
      if (p.fromStep) details.push(`from: ${p.fromStep}`)
      if (p.toStep) details.push(`to: ${p.toStep}`)
      if (p.reason) details.push(p.reason)
      return details
    }
  },

  llm: {
    color: '#10b981',
    collapsed: true,
    extractDetails: (p) => {
      const details: string[] = []
      if (p.model) details.push(p.model)
      if (p.provider) details.push(`(${p.provider})`)

      const totalTokens = (p.tokens?.prompt ?? 0) + (p.tokens?.completion ?? 0)
      if (totalTokens > 0) details.push(`${totalTokens} tokens`)

      return details
    }
  },

  error: {
    color: '#ef4444',
    collapsed: false, // Always expanded for errors
    extractDetails: (p) => {
      const details: string[] = []
      if (p.source) details.push(p.source)
      if (p.error?.message) details.push(p.error.message.slice(0, 50))
      return details
    },
    logContent: (p) => {
      console.error('Error:', p.error)
      if (p.source) console.log('Source:', p.source)
      if (p.context) console.log('Context:', p.context)
    }
  },

  storage: {
    color: '#f59e0b',
    collapsed: true,
    extractDetails: (p) => {
      const details: string[] = []
      if (p.key) details.push(`key: ${p.key}`)
      return details
    }
  },

  system: {
    color: '#3b82f6',
    collapsed: true,
    extractDetails: (p) => {
      const details: string[] = []
      if (p.component) details.push(p.component)
      if (p.message) details.push(p.message)
      return details
    },
    logContent: (p) => {
      if (p.data && Object.keys(p.data).length > 0) {
        console.log('Data:', p.data)
      }
    }
  },

  state: {
    color: '#8b5cf6',
    collapsed: false,
    extractDetails: (p) => {
      return [`${p.previous} → ${p.current}`, `trigger: ${p.trigger}`]
    },
    logContent: (p) => {
      if (p.stateData) {
        console.log('State:', p.stateData)
      }
    }
  }
}
```

**2. Replace 8 functions with single logEvent()**:

```typescript
function logEvent(event: SystemEvent): void {
  const formatter = EVENT_FORMATTERS[event.domain]

  if (!formatter) return

  const details = formatter.extractDetails(event.payload)
  const title = formatTitle(event.domain, event.type, details, event.timestamp)

  createLogGroup(title, formatter.color, formatter.collapsed)

  if (formatter.logContent) {
    formatter.logContent(event.payload)
  } else if (event.payload && Object.keys(event.payload).length > 0) {
    console.log('Payload:', event.payload)
  }

  console.groupEnd()
}
```

**3. Remove eventLoggers map** (no longer needed):

```typescript
// DELETE THIS:
const eventLoggers: Record<SystemEvent['domain'], (event: SystemEvent) => void> = {
  workflow: logWorkflowEvent as (event: SystemEvent) => void,
  agent: logAgentEvent as (event: SystemEvent) => void,
  // ... etc
}
```

### Expected Impact

- **Before**: 324 lines (8 functions + mapping)
- **After**: ~180 lines (single function + formatters)
- **LOC Reduction**: ~140 lines
- **Complexity**: O(1) lookup vs O(n) function dispatch

### Migration Steps

1. Create `EVENT_FORMATTERS` registry
2. Update `logEvent()` to use registry
3. Delete 8 `log*Event()` functions
4. Delete `eventLoggers` map
5. Verify TypeScript compiles
6. Test logging output

---

## Phase 1: ChatService Utilities Extraction

### File: `/extension/src/services/chat.ts` (309 lines)

### Problem 1: Duplicated Message Lifecycle Logic

Lines 156-176 and 198-221 are nearly identical:
```typescript
// Pattern appears 2 times:
if (this.streamingMessageId && this.currentAgent !== message.agent) {
  const currentMessage = useChatStore.getState().messages.find(m => m.id === this.streamingMessageId)

  const shouldKeepEmpty = this.currentAgent === 'planner' || this.currentAgent === 'validator'

  if (currentMessage && !currentMessage.text && !shouldKeepEmpty) {
    useChatStore.setState({
      messages: useChatStore.getState().messages.filter(m => m.id === this.streamingMessageId)
    })
  } else {
    useChatStore.getState().updateMessage(this.streamingMessageId, {
      streaming: false
    })
  }
}
```

### Problem 2: Scattered Error Formatting

3 methods doing similar work:
- `getErrorTitle()` (6 lines)
- `getErrorDetails()` (9 lines)
- `isRetryable()` (5 lines)

### Solution 1: ChatMessageManager

**Create**: `/extension/src/services/chat/message-manager.ts`

```typescript
import { useChatStore } from '@ui/chatStore'
import { generateId } from '@shared/utils/id'
import { getAgentMetadata } from '@ai/orchestrator/agent-metadata'

/**
 * Manages streaming message lifecycle for chat service
 */
export class ChatMessageManager {
  private streamingMessageId: string | null = null
  private currentAgent: string | null = null

  /**
   * Finish current streaming message
   *
   * Removes empty messages (unless agent should keep them).
   * Marks non-empty messages as complete.
   */
  finishCurrentMessage(): void {
    if (!this.streamingMessageId) return

    const message = useChatStore.getState().messages.find(
      m => m.id === this.streamingMessageId
    )

    // Check if we should keep empty messages for this agent
    const shouldKeepEmpty = this.currentAgent
      ? this.shouldKeepEmptyMessage(this.currentAgent)
      : false

    if (message && !message.text && !shouldKeepEmpty) {
      // Remove empty message
      useChatStore.setState({
        messages: useChatStore.getState().messages.filter(
          m => m.id !== this.streamingMessageId
        )
      })
    } else {
      // Mark message as complete
      useChatStore.getState().updateMessage(this.streamingMessageId, {
        streaming: false
      })
    }
  }

  /**
   * Start new streaming message for agent
   */
  startNewMessage(agent: string): void {
    this.currentAgent = agent
    this.streamingMessageId = generateId()

    useChatStore.getState().addMessage({
      id: this.streamingMessageId,
      role: 'assistant',
      text: '',
      streaming: true,
      agent: agent as any
    })
  }

  /**
   * Check if agent's empty messages should be kept
   *
   * Planner and validator don't show tokens (Loom format),
   * but need message placeholder for plan attachment.
   */
  private shouldKeepEmptyMessage(agent: string): boolean {
    const metadata = getAgentMetadata(agent as any)
    return !metadata.streamTokens
  }

  getCurrentAgent(): string | null {
    return this.currentAgent
  }

  getStreamingMessageId(): string | null {
    return this.streamingMessageId
  }

  setCurrentAgent(agent: string | null): void {
    this.currentAgent = agent
  }

  setStreamingMessageId(id: string | null): void {
    this.streamingMessageId = id
  }
}
```

### Solution 2: ErrorFormatter

**Create**: `/extension/src/services/chat/error-formatter.ts`

```typescript
import type { ErrorDetails } from '@shared/types/chat'

/**
 * Error message classifier and formatter for chat errors
 */
export class ErrorFormatter {
  /**
   * Format error into structured ErrorDetails
   */
  format(error: string, lastMessages?: any[]): ErrorDetails {
    return {
      title: this.extractTitle(error),
      details: this.extractDetails(error),
      retryable: this.isRetryable(error),
      retryPayload: this.isRetryable(error) && lastMessages
        ? { messages: lastMessages }
        : undefined
    }
  }

  /**
   * Extract user-friendly error title
   */
  private extractTitle(error: string): string {
    const titlePatterns = [
      { pattern: /API key/i, title: 'API Key Error' },
      { pattern: /network|fetch/i, title: 'Network Error' },
      { pattern: /workflow/i, title: 'Workflow Creation Failed' },
      { pattern: /plan/i, title: 'Planning Failed' }
    ]

    for (const { pattern, title } of titlePatterns) {
      if (pattern.test(error)) return title
    }

    return 'Error'
  }

  /**
   * Extract actionable error details
   */
  private extractDetails(error: string): string | undefined {
    const detailsMap: Array<{ test: (err: string) => boolean; details: string }> = [
      {
        test: (err) => err.includes('API key'),
        details: 'Go to Options (click extension icon) to configure your API keys.'
      },
      {
        test: (err) => err.includes('network') || err.includes('fetch'),
        details: 'Check your internet connection and ensure n8n is running on localhost:5678'
      }
    ]

    for (const { test, details } of detailsMap) {
      if (test(error)) return details
    }

    return undefined
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: string): boolean {
    // Non-retryable errors
    if (error.includes('API key not set')) return false

    // Retryable errors
    if (error.includes('network') || error.includes('timeout')) return true
    if (error.includes('Failed to generate') || error.includes('Failed to create')) return true

    return true // Default to retryable
  }

  /**
   * Extract clean error message without prefixes
   */
  extractMessage(error: string): string {
    return error.replace(/^Error:\s*/i, '')
  }
}
```

### Solution 3: Update ChatService

**Update**: `/extension/src/services/chat.ts`

```typescript
import { ChatMessageManager } from './chat/message-manager'
import { ErrorFormatter } from './chat/error-formatter'

export class ChatService {
  private port = new ChatPort()
  private lastSentMessages: ChatMessage[] = []
  private messageManager = new ChatMessageManager()
  private errorFormatter = new ErrorFormatter()

  // ... rest of class

  private handleAgentActivity(message: { ... }): void {
    if (message.status === 'started') {
      // Finish current message before starting new one
      if (this.messageManager.getStreamingMessageId() &&
          this.messageManager.getCurrentAgent() !== message.agent) {
        this.messageManager.finishCurrentMessage()
      }

      // Don't create streaming message for executor
      if (message.agent === 'executor') {
        this.messageManager.setCurrentAgent('executor')
        this.messageManager.setStreamingMessageId(null)
        return
      }

      this.messageManager.startNewMessage(message.agent)
    }
    else if (message.status === 'complete' &&
             message.agent === this.messageManager.getCurrentAgent()) {
      this.messageManager.finishCurrentMessage()
      this.messageManager.setCurrentAgent(null)
    }
  }

  private handleError(message: { type: 'error'; error: string }): void {
    // ... cleanup code

    const errorDetails = this.errorFormatter.format(
      message.error,
      this.lastSentMessages
    )

    addMessage({
      id: generateId(),
      role: 'error',
      text: this.errorFormatter.extractMessage(message.error),
      error: errorDetails
    })
  }
}
```

### Expected Impact

- **Before**: 309 lines
- **After**: ~240 lines (ChatService) + 80 (MessageManager) + 90 (ErrorFormatter)
- **LOC Reduction**: ~60 lines of duplication
- **Separation**: Message lifecycle and error formatting extracted

### Migration Steps

1. Create `message-manager.ts`
2. Create `error-formatter.ts`
3. Update `ChatService` to use new classes
4. Remove duplicated logic
5. Verify TypeScript compiles
6. Test message lifecycle

---

## Phase 2: React Accessibility Hooks

### Problem

Focus management patterns duplicated across:
- `Modal.tsx` (142 lines) - Focus trap, focus restore, delayed focus
- `PlanMessage.tsx` (183 lines) - Delayed focus

### Solution

**Create**: `/extension/src/ui/hooks/useDelayedFocus.ts`

```typescript
import { useEffect, type RefObject } from 'react'

/**
 * Delay focus on element (for screen reader announcements)
 */
export function useDelayedFocus(
  ref: RefObject<HTMLElement>,
  condition: boolean,
  delay = 100
): void {
  useEffect(() => {
    if (condition && ref.current) {
      const timer = setTimeout(() => ref.current?.focus(), delay)
      return () => clearTimeout(timer)
    }
  }, [condition, ref, delay])
}
```

**Create**: `/extension/src/ui/hooks/useFocusRestore.ts`

```typescript
import { useEffect, useRef } from 'react'

/**
 * Store and restore focus on component unmount
 */
export function useFocusRestore(isActive: boolean): void {
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isActive) {
      previousActiveElement.current = document.activeElement as HTMLElement

      return () => {
        if (previousActiveElement.current) {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [isActive])
}
```

**Create**: `/extension/src/ui/hooks/useFocusTrap.ts`

```typescript
import { useEffect, type RefObject } from 'react'

/**
 * Trap focus within container (for modals/dialogs)
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean,
  onEscape?: () => void
): void {
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Escape key
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape?.()
        return
      }

      // Tab key - focus trap
      if (e.key === 'Tab') {
        const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )

        if (!focusableElements || focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
        else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, containerRef, onEscape])
}
```

### Usage Example

**Modal.tsx - Before (142 lines)**:
```typescript
const previousActiveElement = useRef<HTMLElement | null>(null)

useEffect(() => {
  if (isOpen) {
    previousActiveElement.current = document.activeElement as HTMLElement
    const timer = setTimeout(() => cancelButtonRef.current?.focus(), 100)
    return () => {
      clearTimeout(timer)
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }
}, [isOpen])

useEffect(() => {
  if (!isOpen) return
  const handleKeyDown = (e: KeyboardEvent): void => {
    // ... 40 lines of keyboard handling
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen, onCancel])
```

**Modal.tsx - After (~100 lines)**:
```typescript
useFocusRestore(isOpen)
useDelayedFocus(cancelButtonRef, isOpen)
useFocusTrap(dialogRef, isOpen, onCancel)
```

**Expected Impact**: Eliminate ~40 lines across components, reusable accessibility patterns

---

## Phase 3: Additional Enhancements

### 1. Extract Workflow State Selectors

Move selectors from `chatStore.ts` (191 lines) to separate file:

**Create**: `/extension/src/ui/store/selectors.ts`

### 2. Extract Panel Hooks

Extract drag/resize logic from `Panel.tsx` (192 lines):

**Create**: `/extension/src/ui/hooks/useDraggable.ts`
**Create**: `/extension/src/ui/hooks/useResizable.ts`

### 3. Schema Utilities

Extract Zod schema helpers from `schemas.ts` (391 lines):

**Create**: `/extension/src/shared/validation/schema-utils.ts`

---

## Success Criteria

- ✅ All TypeScript compiles without errors
- ✅ No breaking changes to public APIs
- ✅ All files < 400 lines
- ✅ No functions > 50 lines
- ✅ Zero duplication for extracted patterns
- ✅ Backward compatible via index files
