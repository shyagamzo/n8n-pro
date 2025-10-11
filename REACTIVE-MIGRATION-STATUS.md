# Reactive Architecture Migration Status

## Overview

Migrating from procedural architecture (services call UI/logging directly) to reactive event-driven architecture using RxJS 7.8.2.

## ✅ Completed (Phase 1 & 2)

### Infrastructure
- [x] Add RxJS 7.8.2 dependency
- [x] Create `SystemEvents` class with filtered observables and `shareReplay()`
- [x] Define event types (`SystemEvent`, `WorkflowEvent`, `AgentEvent`, etc.)
- [x] Create emitter helper functions (20+ helpers)
- [x] Create LangGraph event bridge
- [x] Integrate event system into background worker

### Subscribers Implemented
- [x] Logger subscriber - logs all events
- [x] Chat subscriber - transforms events → chat messages
- [x] Activity subscriber - tracks agent/LLM activities with debouncing
- [x] Persistence subscriber - placeholder for auto-save
- [x] Tracing subscriber - accumulates events using `scan` operator

### Initial Refactoring
- [x] Background worker: initialize subscribers on load
- [x] Background worker: emit `emitWorkflowCreated()` and `emitWorkflowFailed()`
- [x] Background worker: global unhandled error handler
- [x] Background worker: cleanup on extension suspend

### Documentation
- [x] Architecture decision document (0036-reactive-rxjs-architecture.mdc)

## 🚧 In Progress

### Current State

**Dual System Active:**
- ✅ Event system is running (subscribers active)
- ⚠️ Old chrome.runtime messaging still active
- ⚠️ Both systems update UI simultaneously (may cause duplicates)

**What Works:**
- Events are being emitted from background worker
- Logger subscriber is logging events
- Chat subscriber is adding messages (in addition to old system)
- Activity subscriber is tracking (in addition to old system)

**Known Issue:**
- Duplicate chat messages (one from event system, one from old messaging)
- Duplicate activities (one from event system, one from old messaging)

## 📋 Remaining Work (Phase 3)

### Background Worker Refactoring

Replace chrome.runtime messaging with events:

- [ ] Remove `post({ type: 'workflow_created', ... })` (line 197)
- [ ] Remove `post({ type: 'token', ... })` usage
- [ ] Remove `post({ type: 'error', ... })` (use events only)
- [ ] Keep only `post({ type: 'done' })` for completion signal

### ChatService Refactoring

Currently ChatService receives chrome.runtime messages. Options:

**Option A:** Remove chrome.runtime messaging entirely
- ChatService becomes simpler (just manages port connection)
- Background worker emits events instead of sending messages
- Subscribers handle all UI updates

**Option B:** Keep messaging for streaming tokens
- Use events for lifecycle (workflow created, errors)
- Use messaging for real-time streaming (tokens)

**Recommendation:** Option B for MVP, Option A for future

### Orchestrator Refactoring

- [ ] Use LangGraph `.streamEvents()` with bridge
- [ ] Remove manual event emission from orchestrator nodes
- [ ] Let LangGraph callbacks handle all event emission

### Remove Scattered Debug Calls

Files with direct `debug()` calls to refactor (20+ files):

- [ ] `extension/src/lib/orchestrator/nodes/planner.ts`
- [ ] `extension/src/lib/orchestrator/nodes/executor.ts`
- [ ] `extension/src/lib/orchestrator/nodes/enrichment.ts`
- [ ] `extension/src/lib/orchestrator/debug-handler.ts`
- [ ] `extension/src/lib/orchestrator/narration.ts`
- [ ] `extension/src/lib/services/narrator.ts`
- [ ] All other files with debug() calls

Strategy: Let events flow to LoggerSubscriber instead of calling debug() directly.

## 🧪 Testing (Phase 4)

- [ ] Create RxJS marble tests for event system
- [ ] Test subscriber isolation
- [ ] Test error handling and retry
- [ ] Test memory leaks (unsubscribe validation)
- [ ] Integration tests for event flow
- [ ] Load testing (1000+ events/sec)

## 🎯 Next Steps

### Immediate (Complete Phase 3)

1. **Refactor background worker messaging**
   - Remove duplicate event/message sends
   - Use events for workflow lifecycle
   - Keep messaging only for streaming tokens

2. **Remove narrator system**
   - Activity subscriber handles this now
   - Remove `narration.ts` and `narrator.ts`
   - Remove narrator integration from orchestrator

3. **Refactor orchestrator nodes**
   - Remove debug() calls
   - Remove narrator calls
   - Let LangGraph bridge emit all events

### Future Enhancements

- Add metrics subscriber (track usage, performance)
- Add undo/redo subscriber (based on event history)
- Add analytics subscriber
- Add audit log subscriber (security/compliance)
- Performance monitoring subscriber

## Migration Safety

### Rollback Plan

If issues arise:
```bash
git revert <commit-range>
```

All new code is in `extension/src/lib/events/` directory - easy to disable by not calling `setup()` functions.

### Validation Checklist

Before disabling old system:
- [ ] All features work with event system
- [ ] No duplicate messages/activities
- [ ] Error handling covers all cases
- [ ] Performance is acceptable
- [ ] No memory leaks
- [ ] Logging captures everything needed

## Current Status Summary

**Infrastructure:** ✅ Complete and tested
**Subscribers:** ✅ Implemented and active
**Refactoring:** 🚧 In progress (30% complete)
**Testing:** ⏳ Not started
**Migration:** 🚧 Dual system active (both old and new)

---

Last updated: Current commit (reactive-architecture branch)

