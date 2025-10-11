# Chrome Extension Context Architecture Fix

## The Problem

Chrome extensions have **separate JavaScript contexts**:
- Background worker (service worker context)
- Content script (webpage context)

Each context has its own `chatStore` instance - they don't share state!

## Current Incorrect Implementation

```typescript
// In background-worker.ts
import * as chat from '../lib/events/subscribers/chat'
chat.setup() // ❌ Updates chatStore in BACKGROUND context

// But React components run in CONTENT SCRIPT context
// They read from a DIFFERENT chatStore instance!
```

**Result:** Events trigger, subscriber runs, updates wrong chatStore, UI never updates!

## Solution: Subscribers by Context

### Background Worker Subscribers

These run in background and have access to background-only resources:

1. **Logger** - Can log in background context
2. **Tracing** - Debugging/analytics in background
3. **Persistence** - Has chrome.storage access
4. **Messaging Bridge** - Converts events → chrome.runtime messages

### Content Script Subscribers

These run in content script and have access to UI resources:

1. **Chat** - Updates chatStore (UI state)
2. **Activity** - Updates chatStore (UI state)

## Corrected Architecture

```
┌──────────────────────────────────────────┐
│     Background Worker Context             │
│                                           │
│  Events → Logger Subscriber (logs)       │
│         → Tracing Subscriber (tracks)    │
│         → Messaging Subscriber (sends)   │
│                 ↓                         │
│         chrome.runtime.postMessage        │
└──────────────────┬────────────────────────┘
                   │
                   │ chrome.runtime messaging
                   ▼
┌──────────────────────────────────────────┐
│     Content Script Context                │
│                                           │
│  chrome.runtime.onMessage                │
│         ↓                                 │
│  ChatService receives messages            │
│         ↓                                 │
│  Updates chatStore (UI context)          │
│         ↓                                 │
│  React components re-render              │
└──────────────────────────────────────────┘
```

## Implementation Fix

### Option A: Messaging Subscriber (Recommended)

Create a subscriber that sends messages instead of updating chatStore:

```typescript
// extension/src/lib/events/subscribers/messaging.ts
// Runs in BACKGROUND
const workflowMessages$ = systemEvents.workflow$.pipe(
  filter(e => e.type === 'created'),
  map(e => ({
    type: 'workflow_created',
    workflowId: e.payload.workflowId,
    workflowUrl: `http://localhost:5678/workflow/${e.payload.workflowId}`
  }))
)

export function setup(post: (msg: BackgroundMessage) => void): void {
  workflowMessages$
    .pipe(takeUntil(destroy$))
    .subscribe(msg => post(msg))
}
```

### Option B: Move Subscribers to Content Script

Move chat and activity subscribers to run in content script:

```typescript
// extension/src/content/event-subscribers.ts
import * as chat from '../lib/events/subscribers/chat'
import * as activity from '../lib/events/subscribers/activity'

chat.setup()
activity.setup()
```

**Problem:** Content script doesn't receive events from background!

## Recommended Solution

**Keep Current Chrome Messaging + Add Events in Background Only**

1. Background worker:
   - Emit events (for logger, tracing)
   - ALSO send chrome.runtime messages (for UI updates)
   
2. Content script:
   - Receive chrome.runtime messages
   - Update chatStore as before

3. Future enhancement:
   - Create message bridge that syncs events across contexts
   - Use chrome.runtime.sendMessage to forward events to content script
   - Content script has its own SystemEvents instance
   - Background sends events via messaging

## Current Status

The chat and activity subscribers are currently **running in wrong context** and won't work. They need to either:
- Be removed from background worker setup
- Be converted to messaging subscribers that send chrome.runtime messages
- Be moved to content script (requires event forwarding)

## Action Items

- [ ] Remove chat.setup() and activity.setup() from background-worker.ts
- [ ] Create messaging.ts subscriber that bridges events → chrome.runtime messages
- [ ] Keep current ChatService receiving messages (no changes needed)
- [ ] Document this context separation clearly

## Files Affected

- `extension/src/background/background-worker.ts` - Remove UI subscribers
- `extension/src/lib/events/subscribers/messaging.ts` - NEW: bridge events to messages
- `extension/src/lib/events/subscribers/chat.ts` - Either delete or move to content script
- `extension/src/lib/events/subscribers/activity.ts` - Either delete or move to content script

