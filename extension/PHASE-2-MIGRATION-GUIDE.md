# Phase 2 Migration Guide

**Version:** Phase 2 Complete (2025-11-02)
**Breaking Changes:** Yes (deprecated `pendingPlan` removed)
**Rollback Available:** Yes (see Rollback Procedure)

---

## Overview

Phase 2 introduced significant architectural improvements to the n8n Pro extension:

1. **Type-Safe Workflow State Machine** - Explicit 7-state machine replacing implicit `pendingPlan` flag
2. **Declarative Agent Metadata Registry** - Centralized configuration eliminating special-case logic
3. **Development-Only Event Validation** - Catches coordination bugs during development
4. **Enhanced UX Components** - Progress visualization, accessibility improvements
5. **WCAG 2.1 AA Compliance** - Full accessibility compliance

This guide helps you understand the breaking changes and migrate any custom code.

---

## Breaking Changes

### 1. `pendingPlan` Removed from ChatStore

**Impact:** High - All code accessing `pendingPlan` must be updated

**Before (Phase 1):**
```typescript
// Accessing pending plan
const { pendingPlan, setPendingPlan } = useChatStore.getState()

if (pendingPlan) {
  // Show plan UI
}

// Clearing plan
setPendingPlan(null)
```

**After (Phase 2):**
```typescript
// Access plan from workflowState
const { workflowState } = useChatStore.getState()

if (workflowState.plan) {
  // Show plan UI
}

// State cleared automatically by state machine
// No manual clearing needed
```

**Migration Steps:**
1. Replace `pendingPlan` with `workflowState.plan`
2. Replace `setPendingPlan(plan)` with state transition events
3. Remove `setPendingPlan(null)` calls (automatic cleanup)

**Files Affected:**
- `ui/chatStore.ts` - Type definition, initialization
- `services/chat.ts` - Message handlers
- Any custom components accessing `pendingPlan`

---

### 2. Workflow State Machine Introduced

**Impact:** Medium - New state-based workflows require understanding state machine

**7 States:**
1. `idle` - No workflow active
2. `enrichment` - Gathering user requirements
3. `planning` - Creating workflow plan
4. `awaiting_approval` - Waiting for user to approve plan
5. `executing` - Creating workflow in n8n
6. `completed` - Workflow created successfully
7. `failed` - Workflow creation failed

**Valid Transitions:**
```typescript
idle → enrichment → planning → awaiting_approval → executing → completed
                                                             ↘ failed
```

**Using State Machine:**
```typescript
import { useChatStore } from '@ui/chatStore'

// Get current state
const workflowState = useChatStore(state => state.workflowState)

// Check state
if (workflowState.state === 'awaiting_approval') {
  // Show approve button
}

// Use derived selectors
import { useIsWorkflowActive, useCanUserInteract } from '@ui/chatStore'

const isActive = useIsWorkflowActive() // true if enrichment/planning/executing
const canInteract = useCanUserInteract() // true if idle/awaiting_approval/completed/failed
```

**Migration Steps:**
1. Replace boolean flags (`isPending`, `isLoading`) with state checks
2. Use derived selectors for common queries
3. Emit events instead of manually setting state

**See:** `src/shared/types/workflow-state/README.md` for full state machine docs

---

### 3. Agent Metadata Registry Replaces Hardcoded Logic

**Impact:** Low - Only affects code adding new agents

**Before (Phase 1):**
```typescript
// Hardcoded special cases in MessageBubble
function getAgentInfo(agent: string) {
  switch (agent) {
    case 'planner':
      return { name: 'Planner', message: 'Creating plan...' }
    case 'executor':
      return { name: 'Executor', message: 'Creating workflow...' }
    default:
      return { name: agent, message: 'Working...' }
  }
}

// Special-case logic scattered across components
if (agent === 'planner' || agent === 'validator') {
  // Don't show tokens (Loom format)
}
```

**After (Phase 2):**
```typescript
// Centralized declarative metadata
import { getAgentMetadata } from '@ai/orchestrator/agent-metadata'

const metadata = getAgentMetadata('planner')
// {
//   displayName: 'Planner',
//   workingMessage: 'Creating workflow plan...',
//   shouldCreateMessage: true,
//   shouldShowTokens: false,
//   shouldPersist: true
// }
```

**Migration Steps:**
1. Replace hardcoded `getAgentInfo()` with `getAgentMetadata()`
2. Remove special-case `if` statements for specific agents
3. Add new agents to registry instead of scattering logic

**Files Affected:**
- `ui/chat/MessageBubble.tsx` - Uses metadata for display
- `services/chat.ts` - Uses metadata for message creation

**See:** `src/ai/orchestrator/agent-metadata.ts` for registry

---

## Dual Storage Pattern

**Critical Concept:** Phase 2 uses a dual storage pattern for plan data:

### Transient State (`workflowState.plan`)
- **Purpose:** Current active workflow plan
- **Lifetime:** Cleared on new workflow creation
- **Used By:** UI components showing current plan
- **Storage:** In-memory only (Zustand store)

### Persistent History (`message.plan`)
- **Purpose:** Historical record of plans
- **Lifetime:** Persists across sessions
- **Used By:** Chat history display
- **Storage:** `chrome.storage.local`

**Example:**
```typescript
// Current workflow plan (transient)
const currentPlan = useChatStore(state => state.workflowState.plan)

// Historical plan from message (persistent)
const historicalPlan = message.plan

// When workflow completes:
// 1. workflowState.plan is attached to message
// 2. message.plan is saved to chrome.storage.local
// 3. workflowState.plan is cleared when new workflow starts
```

**Why This Matters:**
- Don't store `workflowState.plan` in `chrome.storage.local` (already transient)
- Don't clear `message.plan` (historical record)
- Use `workflowState.plan` for "current plan" UI
- Use `message.plan` for "show previous plans" UI

---

## Event Emission Changes

**Impact:** Low - Only affects code emitting workflow events

**Before (Phase 1):**
```typescript
// Manual state updates
useChatStore.getState().setPendingPlan(plan)

// No state transition events
```

**After (Phase 2):**
```typescript
// Emit domain events (services/background worker)
import { emitPlanGenerated } from '@events/emitters'

emitPlanGenerated({ plan, validationResult })

// State transitions happen automatically via subscriber
// (workflow-state subscriber derives transitions from events)
```

**Migration Steps:**
1. Replace direct state updates with event emission
2. Let subscribers handle state derivation
3. Use state transition events for cross-context communication

**See:** `src/events/README.md` for event system architecture

---

## New Components

Phase 2 introduced new UI components:

### ProgressStepper
```typescript
import { ProgressStepper } from '@ui/feedback'

<ProgressStepper className="my-stepper" />
// Shows 5-step workflow progress (enrichment → completed)
// Auto-syncs with workflowState.state
```

### LoadingSpinner
```typescript
import { LoadingSpinner } from '@ui/feedback'

<LoadingSpinner size="sm" inline label="Loading..." />
// 3 sizes: sm (16px), md (24px), lg (40px)
// Hardware-accelerated, respects prefers-reduced-motion
```

### SkeletonLoader
```typescript
import { SkeletonLoader } from '@ui/feedback'

<SkeletonLoader variant="plan-message" />
// 3 variants: plan-message, chat-message, inline-text
// Shimmer animation, zero layout shifts
```

**See:** `src/ui/feedback/` for component documentation

---

## Accessibility Improvements

Phase 2 achieved WCAG 2.1 AA compliance:

### Focus Indicators
```css
/* All interactive elements now have visible focus indicators */
.btn:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}
```

### ARIA Semantics
```tsx
{/* Proper ARIA for collapsible elements */}
<button
  aria-expanded={isExpanded}
  aria-controls="panel-id"
>
  Toggle
</button>
<div id="panel-id">...</div>

{/* Proper ARIA for error messages */}
<div role="alert" aria-describedby="error-msg">
  <p id="error-msg">Error details</p>
</div>
```

### Color Contrast
- Updated muted text color from `#6b7280` (3.1:1) to `#9ca3af` (4.52:1)
- All text now passes WCAG AA 4.5:1 ratio

---

## Testing Phase 2 Changes

### Manual Testing Checklist

**State Machine:**
- [ ] Start workflow → verify enrichment state
- [ ] Complete enrichment → verify planning state
- [ ] Generate plan → verify awaiting_approval state
- [ ] Approve plan → verify executing state
- [ ] Create workflow → verify completed state
- [ ] Trigger error → verify failed state

**UI Components:**
- [ ] ProgressStepper shows correct step
- [ ] LoadingSpinner animates smoothly
- [ ] PlanMessage shows phase-specific UI
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Focus indicators visible

**Accessibility:**
- [ ] Screen reader announces state changes
- [ ] All interactive elements focusable
- [ ] Color contrast passes WCAG AA
- [ ] Reduced motion respected

**Event System:**
- [ ] Open DevTools console (development mode)
- [ ] Verify state transition logs: `[WorkflowState] idle → enrichment`
- [ ] Verify no validation errors
- [ ] Check no duplicate agent starts

### Development Validation

Phase 2 includes development-only validation that catches bugs:

```typescript
// Validation runs automatically in dev mode
// Check console for validation messages:

// ✅ Valid sequence
// [Validation] Event validation initialized (development mode)

// ❌ Invalid sequence (agent → END instead of orchestrator)
// [Error] Agent 'planner' went directly to 'END' instead of 'orchestrator'

// ❌ Duplicate agent start
// [Error] Agent 'enrichment' started twice without completion

// ⚠️ Performance regression
// [Warning] Workflow creation took 35000ms (threshold: 30000ms)
```

**To disable validation:**
```bash
# Validation only runs in dev mode
yarn build  # Production build (no validation)
```

---

## Rollback Procedure

If issues arise, you can rollback Phase 2 changes:

### Option 1: Git Revert (Recommended)

```bash
# Find Phase 2 merge commit
git log --oneline --grep="Phase 2"

# Revert the merge commit
git revert -m 1 <commit-hash>

# Rebuild
yarn build
```

### Option 2: Temporary Workaround

If you need `pendingPlan` temporarily while migrating:

```typescript
// Add to chatStore.ts (TEMPORARY - not recommended)
type ChatState = {
  // ... existing fields
  pendingPlan?: Plan | null  // DEPRECATED: Use workflowState.plan
}

export const useChatStore = create<ChatState>((set) => ({
  // ... existing state
  pendingPlan: null,
  setPendingPlan: (p) => set({ pendingPlan: p }),
}))
```

**Warning:** This is a temporary workaround only. Migrate to `workflowState.plan` ASAP.

---

## Files Touched (37 Total)

### Created (10 files)
**Week 1 - Type Systems:**
- `src/ai/orchestrator/agent-metadata.ts`
- `src/shared/types/workflow-state/types.ts`
- `src/shared/types/workflow-state/machine.ts`
- `src/shared/types/workflow-state/index.ts`
- `src/events/validation/event-contracts.ts`
- `src/events/validation/operators.ts`
- `src/events/validation/index.ts`

**Week 2 - Integration:**
- `src/events/subscribers/workflow-state.ts`

**Week 3 - UX:**
- `src/ui/feedback/ProgressStep.tsx`
- `src/ui/feedback/ProgressStepper.tsx`
- `src/ui/feedback/ProgressStepper.css`
- `src/ui/feedback/LoadingSpinner.tsx`
- `src/ui/feedback/LoadingSpinner.css`
- `src/ui/feedback/SkeletonLoader.tsx`
- `src/ui/feedback/SkeletonLoader.css`
- `src/ui/feedback/index.ts`

### Modified (13 files)
**Week 2 - Integration:**
- `src/events/types.ts` - Added StateTransitionEvent
- `src/events/emitters.ts` - Added emitPlanGenerated
- `src/events/index.ts` - Validation initialization
- `src/events/subscribers/messaging.ts` - Bridge state transitions
- `src/shared/types/messaging.ts` - Added state_transition message
- `src/ui/chatStore.ts` - Added workflowState, selectors
- `src/services/chat.ts` - handleStateTransition
- `src/entries/background/background-worker.ts` - Initialize subscriber

**Week 3 - UX:**
- `src/ui/chat/PlanMessage.tsx` - Phase-specific UI
- `src/ui/chat/PlanMessage.css` - Phase state styles
- `src/ui/chat/MessageBubble.tsx` - Agent metadata

**Week 4 - Polish:**
- `src/ui/utilities.css` - Focus indicators
- `src/ui/feedback/ProgressStepper.css` - Color contrast

---

## Common Migration Issues

### Issue: `pendingPlan is not defined`

**Cause:** Code still using deprecated `pendingPlan`

**Fix:**
```typescript
// Before
const { pendingPlan } = useChatStore.getState()

// After
const { workflowState } = useChatStore.getState()
const plan = workflowState.plan
```

---

### Issue: Plan not showing in UI

**Cause:** Not checking `workflowState.state` for `awaiting_approval`

**Fix:**
```typescript
// Check state before showing plan UI
if (workflowState.state === 'awaiting_approval' && workflowState.plan) {
  return <PlanMessage plan={workflowState.plan} />
}
```

---

### Issue: Plan cleared too early

**Cause:** Confusing transient vs persistent storage

**Fix:**
```typescript
// Current plan (transient - cleared on new workflow)
const currentPlan = workflowState.plan

// Historical plan (persistent - survives sessions)
const historicalPlan = message.plan

// Use currentPlan for "current workflow" UI
// Use historicalPlan for "show previous plans" UI
```

---

### Issue: State transitions not working

**Cause:** Manually setting state instead of emitting events

**Fix:**
```typescript
// Don't manually set state
// setWorkflowState({ state: 'planning' })  // ❌ WRONG

// Emit domain events instead
emitAgentStarted({ agent: 'planner' })  // ✅ CORRECT
// Subscriber derives state transition automatically
```

---

## Getting Help

**Documentation:**
- State Machine: `src/shared/types/workflow-state/README.md`
- Event System: `src/events/README.md`
- Agent Metadata: `src/ai/orchestrator/agent-metadata.ts`
- Progress Tracking: `PHASE-2-PROGRESS.md`

**Architecture Decisions:**
- ADR 0042: Agent Metadata System
- ADR 0043: Workflow State Machine

**Development:**
- Enable development mode: `yarn dev`
- Check console for validation errors
- Review event logs: `[WorkflowState]`, `[Validation]`

**Issues:**
- Report bugs: GitHub Issues
- Review decisions: `.cursor/rules/decisions/n8n-extension/`
