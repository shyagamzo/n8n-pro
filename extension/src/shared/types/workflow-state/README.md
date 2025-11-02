# Workflow State Machine

**Purpose:** Type-safe state management for workflow creation lifecycle
**Pattern:** Explicit state machine with immutable transitions
**Location:** `@shared/types/workflow-state`

---

## State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow State Machine                        │
│                                                                   │
│  START                                                            │
│    │                                                              │
│    ▼                                                              │
│  ┌──────┐  enrichment    ┌────────────┐  planning               │
│  │ idle │────────────────▶│ enrichment │────────────┐            │
│  └──────┘  agent:started  └────────────┘  agent:    │            │
│    ▲                                      completed  │            │
│    │                                                 ▼            │
│    │                                        ┌──────────────┐     │
│    │                                        │   planning   │     │
│    │                                        └──────────────┘     │
│    │                                                 │            │
│    │                                  workflow:      │            │
│    │                                  validated      │            │
│    │                                                 ▼            │
│    │                                  ┌───────────────────────┐  │
│    │                                  │ awaiting_approval     │  │
│    │                                  └───────────────────────┘  │
│    │                                           │                  │
│    │                           executor:       │                  │
│    │                           started         │                  │
│    │                                           ▼                  │
│    │                                  ┌──────────────┐            │
│    │                                  │  executing   │            │
│    │                                  └──────────────┘            │
│    │                                           │                  │
│    │                      ┌────────────────────┼────────────┐    │
│    │          workflow:   │                    │ workflow:  │    │
│    │          created     │                    │ failed     │    │
│    │                      ▼                    ▼            │    │
│    │            ┌───────────────┐    ┌──────────────┐      │    │
│    │            │   completed   │    │    failed    │      │    │
│    │            └───────────────┘    └──────────────┘      │    │
│    │                      │                    │            │    │
│    │                      │  reset/new         │  reset/    │    │
│    └──────────────────────┴────────────────────┴────new─────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## States

### `idle`
- **Description:** No workflow currently active
- **User Can:** Start new workflow, browse history
- **UI Shows:** Chat input enabled, no progress indicator
- **Next States:** `enrichment` (user starts workflow)

### `enrichment`
- **Description:** AI gathering user requirements
- **User Can:** Wait (no interaction)
- **UI Shows:** "Understanding requirements..." message, progress step 1/5
- **Next States:** `planning` (enrichment complete)

### `planning`
- **Description:** AI creating workflow plan
- **User Can:** Wait (no interaction)
- **UI Shows:** "Creating plan..." message, progress step 2/5
- **Next States:** `awaiting_approval` (plan validated)

### `awaiting_approval`
- **Description:** Waiting for user to approve plan
- **User Can:** Approve plan, reject plan (start new workflow)
- **UI Shows:** Plan preview, "Create Workflow" button, progress step 3/5
- **Next States:** `executing` (user approves), `idle` (user rejects)

### `executing`
- **Description:** Creating workflow in n8n
- **User Can:** Wait (no interaction)
- **UI Shows:** "Creating workflow..." spinner, progress step 4/5
- **Next States:** `completed` (success), `failed` (error)

### `completed`
- **Description:** Workflow successfully created
- **User Can:** Start new workflow, open workflow in n8n
- **UI Shows:** Success message, "Open in n8n" link, progress step 5/5
- **Next States:** `idle` (user starts new workflow)

### `failed`
- **Description:** Workflow creation failed
- **User Can:** Retry, start new workflow
- **UI Shows:** Error message, "Try Again" button
- **Next States:** `idle` (user retries or starts new)

---

## Valid Transitions

| From State          | Event Trigger          | To State            | Trigger Source        |
|---------------------|------------------------|---------------------|-----------------------|
| `idle`              | `agent:started` (enrichment) | `enrichment`    | Agent event           |
| `enrichment`        | `agent:completed` (enrichment) | `planning`    | Agent event           |
| `planning`          | `workflow:validated`   | `awaiting_approval` | Workflow event        |
| `awaiting_approval` | `agent:started` (executor) | `executing`     | Agent event           |
| `executing`         | `workflow:created`     | `completed`         | Workflow event        |
| `executing`         | `workflow:failed`      | `failed`            | Workflow event        |
| `completed`         | `reset`                | `idle`              | Manual reset          |
| `failed`            | `reset`                | `idle`              | Manual reset          |

**Invalid Transitions:**
- Cannot skip states (e.g., `idle → executing`)
- Cannot go backwards (e.g., `executing → planning`)
- All transitions are validated at runtime (throws TypeError if invalid)

---

## WorkflowStateData Type

```typescript
export type WorkflowStateData = {
  state: WorkflowState
  plan?: Plan | null
  workflowId?: string | null
  error?: {
    message: string
    code?: string
    retryable?: boolean
  } | null
}
```

**Fields:**

- `state` - Current workflow state (required)
- `plan` - Current workflow plan (transient, cleared on reset)
- `workflowId` - ID of created workflow (available in `completed` state)
- `error` - Error details (available in `failed` state)

**State-Specific Data:**

| State               | Available Fields           | Cleared Fields        |
|---------------------|----------------------------|-----------------------|
| `idle`              | `state`                    | All optional fields   |
| `enrichment`        | `state`                    | All optional fields   |
| `planning`          | `state`                    | All optional fields   |
| `awaiting_approval` | `state`, `plan`            | `workflowId`, `error` |
| `executing`         | `state`, `plan`            | `workflowId`, `error` |
| `completed`         | `state`, `plan`, `workflowId` | `error`            |
| `failed`            | `state`, `error`           | `plan`, `workflowId`  |

---

## Usage Examples

### Basic Usage

```typescript
import {
  createInitialState,
  startEnrichment,
  startPlanning,
  awaitApproval,
  startExecution,
  completeWorkflow,
  failWorkflow
} from '@shared/types/workflow-state'

// Initialize state
let state = createInitialState()
// { state: 'idle', plan: null, workflowId: null, error: null }

// Start workflow
state = startEnrichment(state)
// { state: 'enrichment', plan: null, workflowId: null, error: null }

// Move to planning
state = startPlanning(state)
// { state: 'planning', plan: null, workflowId: null, error: null }

// Plan validated → awaiting approval
state = awaitApproval(state, plan)
// { state: 'awaiting_approval', plan: {...}, workflowId: null, error: null }

// User approves → start execution
state = startExecution(state)
// { state: 'executing', plan: {...}, workflowId: null, error: null }

// Workflow created
state = completeWorkflow(state, 'workflow-123')
// { state: 'completed', plan: {...}, workflowId: 'workflow-123', error: null }

// Reset for new workflow
state = createInitialState()
// { state: 'idle', plan: null, workflowId: null, error: null }
```

---

### Error Handling

```typescript
import { failWorkflow, isTerminalState } from '@shared/types/workflow-state'

try {
  // Workflow creation fails
  state = failWorkflow(state, {
    message: 'Failed to create workflow',
    code: 'NETWORK_ERROR',
    retryable: true
  })
  // { state: 'failed', plan: null, workflowId: null, error: {...} }

  // Check if terminal
  if (isTerminalState(state.state)) {
    console.log('Workflow finished (success or failure)')
  }
} catch (error) {
  // Invalid transition (e.g., failing from 'idle' state)
  console.error('Invalid state transition:', error)
}
```

---

### Type Guards

```typescript
import {
  isValidTransition,
  isWorkingState,
  isTerminalState,
  canUserInteract
} from '@shared/types/workflow-state'

// Check valid transitions
if (isValidTransition('idle', 'enrichment')) {
  // Proceed with transition
}

// Check if workflow is actively processing
if (isWorkingState(state.state)) {
  // enrichment, planning, or executing
  // Disable user input
}

// Check if workflow finished
if (isTerminalState(state.state)) {
  // completed or failed
  // Enable "Start New Workflow" button
}

// Check if user can interact
if (canUserInteract(state.state)) {
  // idle, awaiting_approval, completed, or failed
  // Enable chat input
}
```

---

### React Integration (Zustand)

```typescript
import { useChatStore } from '@ui/chatStore'

function WorkflowProgress() {
  // Get full state
  const workflowState = useChatStore(state => state.workflowState)

  // Or use derived selectors (recommended)
  const isActive = useIsWorkflowActive()     // enrichment/planning/executing
  const canInteract = useCanUserInteract()   // idle/awaiting_approval/completed/failed
  const isTerminal = useIsWorkflowTerminal() // completed/failed

  // Render based on state
  if (workflowState.state === 'awaiting_approval') {
    return <PlanMessage plan={workflowState.plan} />
  }

  if (workflowState.state === 'executing') {
    return <LoadingSpinner label="Creating workflow..." />
  }

  if (workflowState.state === 'completed') {
    return <SuccessMessage workflowId={workflowState.workflowId} />
  }

  if (workflowState.state === 'failed') {
    return <ErrorMessage error={workflowState.error} />
  }

  return null
}
```

---

## Dual Storage Pattern

**Critical:** The state machine uses a dual storage pattern for plan data:

### Transient State (`workflowState.plan`)

**Purpose:** Current active workflow plan
**Lifetime:** Cleared when workflow completes or fails
**Storage:** In-memory (Zustand store)
**Used For:** UI showing current workflow progress

```typescript
// Current plan (cleared on reset)
const currentPlan = useChatStore(state => state.workflowState.plan)

if (currentPlan) {
  // Show "current workflow" UI
}
```

### Persistent History (`message.plan`)

**Purpose:** Historical record of all plans
**Lifetime:** Persists across sessions
**Storage:** `chrome.storage.local`
**Used For:** Chat history, "show previous plans" feature

```typescript
// Historical plan (survives sessions)
const message: ChatMessage = {
  id: 'msg-123',
  role: 'assistant',
  text: '',
  plan: { /* plan data */ }  // Saved to chrome.storage.local
}
```

**Workflow:**
1. Plan generated → `workflowState.plan` set
2. User approves → `workflowState.state` transitions to `executing`
3. Workflow completes → `workflowState.plan` attached to `message.plan`
4. Message saved → `message.plan` persisted to `chrome.storage.local`
5. New workflow → `workflowState.plan` cleared (reset to `idle`)
6. Historical plan → `message.plan` remains in storage

**Common Pitfall:**
```typescript
// ❌ WRONG - Don't persist transient state
storageSet('currentPlan', workflowState.plan)

// ✅ CORRECT - Use transient state for current UI
const currentPlan = workflowState.plan

// ✅ CORRECT - Persist plan in message history
const message = {
  plan: workflowState.plan  // Attached when workflow completes
}
```

---

## Common Pitfalls

### ❌ Pitfall 1: Manual State Assignment

```typescript
// ❌ WRONG - Don't manually assign state
workflowState.state = 'executing'

// ✅ CORRECT - Use transition functions
state = startExecution(state)
```

**Why:** Transition functions validate valid transitions and clear appropriate fields.

---

### ❌ Pitfall 2: Skipping Validation

```typescript
// ❌ WRONG - Bypassing validation
state = { state: 'completed', plan: null, workflowId: 'abc', error: null }

// ✅ CORRECT - Use transition functions
state = completeWorkflow(state, 'abc')
```

**Why:** Validation catches invalid transitions that cause UI bugs.

---

### ❌ Pitfall 3: Confusing Transient vs Persistent Storage

```typescript
// ❌ WRONG - Storing transient state permanently
await storageSet('workflowState', workflowState)

// ✅ CORRECT - Use dual storage pattern
// Transient: workflowState.plan (current workflow)
// Persistent: message.plan (history)
```

**Why:** Transient state should be cleared on reset, persistent state should survive sessions.

---

### ❌ Pitfall 4: Race Conditions

```typescript
// ❌ WRONG - Multiple concurrent transitions
state = startEnrichment(state)
state = startPlanning(state)  // Invalid! enrichment must complete first

// ✅ CORRECT - Sequential transitions based on events
state = startEnrichment(state)
// Wait for agent:completed event
state = startPlanning(state)
```

**Why:** State machine enforces sequential workflow progression.

---

### ❌ Pitfall 5: Not Checking State Before Transitions

```typescript
// ❌ WRONG - Blindly transitioning
state = awaitApproval(state, plan)  // Might fail if not in 'planning'

// ✅ CORRECT - Check current state first
if (state.state === 'planning') {
  state = awaitApproval(state, plan)
}
```

**Why:** Invalid transitions throw errors. Check state before transitioning.

---

## Event-Driven Transitions

The state machine is driven by events from the RxJS event system:

```typescript
// workflow-state subscriber (background worker)
systemEvents.agent$.subscribe(event => {
  if (event.agent === 'enrichment' && event.type === 'started') {
    state = startEnrichment(state)
    emitStateTransition({ previous: 'idle', current: 'enrichment', ... })
  }

  if (event.agent === 'enrichment' && event.type === 'completed') {
    state = startPlanning(state)
    emitStateTransition({ previous: 'enrichment', current: 'planning', ... })
  }
})

systemEvents.workflow$.subscribe(event => {
  if (event.type === 'validated') {
    state = awaitApproval(state, event.payload.plan)
    emitStateTransition({ previous: 'planning', current: 'awaiting_approval', ... })
  }

  if (event.type === 'created') {
    state = completeWorkflow(state, event.payload.workflowId)
    emitStateTransition({ previous: 'executing', current: 'completed', ... })
  }

  if (event.type === 'failed') {
    state = failWorkflow(state, event.payload.error)
    emitStateTransition({ previous: 'executing', current: 'failed', ... })
  }
})
```

**Key Points:**
- Services emit domain events (what happened)
- Subscriber derives state transitions (decisions)
- State transition events bridged to content script
- UI updates via Zustand store

**See:** `src/events/subscribers/workflow-state.ts` for implementation

---

## Testing

### Unit Tests (Recommended)

```typescript
import {
  createInitialState,
  startEnrichment,
  startPlanning,
  awaitApproval,
  isValidTransition
} from '@shared/types/workflow-state'

describe('Workflow State Machine', () => {
  test('valid transition: idle → enrichment', () => {
    const state = createInitialState()
    const next = startEnrichment(state)
    expect(next.state).toBe('enrichment')
  })

  test('invalid transition: idle → executing throws', () => {
    const state = createInitialState()
    expect(() => startExecution(state)).toThrow(TypeError)
  })

  test('state-specific data cleared on transition', () => {
    let state = createInitialState()
    state = awaitApproval(state, mockPlan)
    expect(state.plan).toBeDefined()

    state = failWorkflow(state, mockError)
    expect(state.plan).toBeNull()  // Cleared on failure
    expect(state.error).toBeDefined()
  })
})
```

### Manual Testing

1. **Development Mode:**
   ```bash
   yarn dev
   ```

2. **Open DevTools Console:**
   - Look for `[WorkflowState]` logs showing transitions
   - Verify state progression: `idle → enrichment → planning → ...`

3. **Trigger Each State:**
   - Start workflow → `enrichment`
   - Wait for plan → `awaiting_approval`
   - Click "Create Workflow" → `executing`
   - Wait for completion → `completed` or `failed`

4. **Verify State-Specific UI:**
   - `awaiting_approval` shows approve button
   - `executing` shows spinner
   - `completed` shows success message + link
   - `failed` shows error + retry button

---

## Performance

**Overhead:** <1ms per state transition
**Memory:** ~1KB per WorkflowStateData instance
**Validation:** Development-only (stripped from production)

**Optimizations:**
- Immutable transitions (no mutations)
- Type guards use simple comparisons
- State-specific data cleared proactively

---

## Architecture Decisions

See ADR 0043 (`.cursor/rules/decisions/n8n-extension/state-management/0043-workflow-state-machine.mdc`) for rationale:

- Why 7 states (not more, not less)
- Why explicit transitions (not boolean flags)
- Why dual storage pattern
- Why event-driven (not manual updates)
- Why immutable (not mutable)

---

## Related Documentation

- **Migration Guide:** `PHASE-2-MIGRATION-GUIDE.md`
- **Event System:** `src/events/README.md`
- **Agent Metadata:** `src/ai/orchestrator/agent-metadata.ts`
- **Progress Tracking:** `PHASE-2-PROGRESS.md`
