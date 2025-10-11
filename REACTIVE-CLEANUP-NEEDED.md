# Reactive Architecture - Cleanup Needed

## Items to Clean Up

### 1. **Obsolete Narrator System Files** 🗑️

**Files to DELETE:**
- `extension/src/lib/orchestrator/narration.ts` (49 lines) - Not imported anywhere
- `extension/src/lib/services/narrator.ts` (112 lines) - Not imported anywhere
- `extension/src/lib/prompts/agents/narrator.md` - Prompt file (may be needed by prompt loader)

**Check first:**
```bash
grep -r "narrator\.md" extension/src/lib/prompts/
```

If narrator.md is still referenced in prompt-loader.ts, we need to remove it from the loader too.

**Impact:** None (files not imported)

### 2. **Outdated Documentation** 📚

**AGENT-TRACING-GUIDE.md** - References OLD tracing system

**Problem:**
```markdown
### Manual Tracing (For New Agent Code)
const tracer = createAgentTracer()  // ❌ Old pattern
tracer.setAgent('classifier')
tracer.logDecision(...)
```

**Should say:**
```markdown
### Event-Based Tracing (Current System)
Events are automatically captured by LangGraph bridge
Access traces via: tracing.getTrace(sessionId)
```

**Recommendation:** 
- **UPDATE** this guide to reflect new reactive system
- Mention old AgentTracingCallback is legacy
- Document new TracingSubscriber approach

**WORKFLOW-DEBUG-GUIDE.md** - References OLD debug functions

**Problem:**
```markdown
**Log Types:**
debugWorkflowCreation(workflow)    // ❌ These don't exist anymore
debugWorkflowCreated(id, url)      // ❌ Replaced by events
debugLLMResponse(response)          // ❌ Replaced by events
```

**Should say:**
```markdown
**Event-Based Debugging:**
All operations now emit events automatically
Logger subscriber logs everything
Check console for structured event logs
```

**Recommendation:**
- **UPDATE** or **DELETE** this guide
- Current debugging is via event logs, not manual debug calls

### 3. **Outdated Decision Document** 📝

**File:** `.cursor/rules/decisions/n8n-extension/architecture/0032-orchestrator-langgraph.mdc`

**Line 29:**
```markdown
- Integrates with narrator for progress updates
```

**Line 63:**
```markdown
- **Narrator**: Activity updates via metadata
```

**Should be:**
```markdown
- Progress updates via reactive event system
- **Event System**: Activity updates via SystemEvents
```

**Recommendation:** **UPDATE** decision document to reflect narrator removal and event system

### 4. **Redundant Tracing System?** 🤔

**Files:**
- `extension/src/lib/ai/tracing.ts` (273 lines) - AgentTracingCallback
- `extension/src/lib/ai/model.ts` - References AgentTracingCallback

**vs**
- `extension/src/lib/events/subscribers/tracing.ts` (78 lines) - TracingSubscriber

**Are they redundant?**

**AgentTracingCallback:**
- LangChain BaseCallbackHandler
- Manually attached to LLM calls
- Logs decisions, handoffs, LLM calls
- 273 lines of code

**TracingSubscriber:**
- RxJS subscriber
- Listens to SystemEvents
- Accumulates event history
- 78 lines of code

**Analysis:**
- **Similar purpose** - Both track agent operations
- **Different mechanisms** - Callback vs Event
- **AgentTracingCallback is UNUSED** - Not attached to any models currently!

**Recommendation:**
- **DELETE** `lib/ai/tracing.ts` (AgentTracingCallback) - redundant and unused
- **DELETE** references in `lib/ai/model.ts`
- **KEEP** TracingSubscriber (active and working)

### 5. **BackgroundMessage Types - Keep These!** ✅

**Found:** `agent_activity` in messaging.ts

**Status:** ✅ **STILL USED** - Don't delete!

**Why:** Background worker still sends these messages via chrome.runtime.postMessage. ChatService receives them and updates chatStore. This is correct for the current hybrid architecture.

### 6. **DebugCallbackHandler - Keep?** ✅

**File:** `extension/src/lib/orchestrator/debug-handler.ts`

**Usage:** Still used in orchestrator.ts:
```typescript
callbacks: [new DebugCallbackHandler(session)]
```

**Purpose:** Integrates DebugSession with LangChain callbacks

**Recommendation:** ✅ **KEEP** - Still useful for detailed debugging

## Cleanup Plan

### Priority 1: Delete Unused Files

```bash
# Narrator system (confirmed unused)
rm extension/src/lib/orchestrator/narration.ts
rm extension/src/lib/services/narrator.ts

# Old tracing system (redundant with new TracingSubscriber)
rm extension/src/lib/ai/tracing.ts

# Check if narrator.md is referenced first:
grep -r "narrator\.md" extension/src/lib/prompts/
# If not, delete:
rm extension/src/lib/prompts/agents/narrator.md
```

**Impact:** None (files not imported)  
**Risk:** Low

### Priority 2: Update Documentation

**AGENT-TRACING-GUIDE.md:**
- Update to reflect new reactive tracing
- Remove AgentTracingCallback examples
- Document TracingSubscriber usage
- Add event-based tracing examples

**WORKFLOW-DEBUG-GUIDE.md:**
- Update to reflect event-based debugging
- Remove references to deleted debug functions
- Document logger subscriber approach
- Show how to view events in console

### Priority 3: Update Decision Document

**0032-orchestrator-langgraph.mdc:**
- Remove narrator references (lines 29, 63)
- Add event system references
- Update callback system section
- Reference new 0036-reactive-rxjs-architecture.mdc

### Priority 4: Cleanup lib/ai/model.ts

**Remove:**
```typescript
import type { AgentTracingCallback } from './tracing'

export type ChatModelOptions = {
  tracer?: AgentTracingCallback  // ❌ Delete this
}
```

**After:** File will be much simpler, just ChatOpenAI wrapper

### Priority 5: Update prompt-loader.ts

If narrator is still in AgentType union:
```typescript
export type AgentType = 'classifier' | 'enrichment' | 'planner' | 'validator' | 'narrator' | 'executor'
//                                                                              ^^^^^^^^^ Remove
```

And remove from prompts map if it exists.

## Files to Keep (Still Used)

✅ **DebugCallbackHandler** - Used in orchestrator for DebugSession integration
✅ **DebugSession** - Used for detailed step-by-step debugging
✅ **agent_activity in BackgroundMessage** - Still used for chrome.runtime messaging
✅ **ChatService.handleAgentActivity()** - Still receives and processes these messages
✅ **debug.ts utilities** - Used by logger subscriber

## Summary

### Must Delete (4-5 files)
1. `narration.ts` - Unused
2. `narrator.ts` - Unused
3. `ai/tracing.ts` - Redundant with TracingSubscriber
4. Maybe: `narrator.md` - Check if referenced

### Must Update (3 files)
1. `AGENT-TRACING-GUIDE.md` - Outdated tracing examples
2. `WORKFLOW-DEBUG-GUIDE.md` - References deleted debug functions
3. `0032-orchestrator-langgraph.mdc` - References narrator

### Must Refactor (2 files)
1. `lib/ai/model.ts` - Remove AgentTracingCallback references
2. `lib/prompts/prompt-loader.ts` - Remove narrator from AgentType (maybe)

## Estimated Impact

- **Files to delete:** 4-5
- **Files to update:** 5
- **Lines to remove:** ~450 lines
- **Risk:** Low (all verified unused)
- **Benefit:** Cleaner codebase, less confusion

## Verification Commands

```bash
# Verify narration.ts not imported
grep -r "from.*narration" extension/src --include="*.ts" --include="*.tsx"

# Verify narrator.ts not imported  
grep -r "from.*narrator" extension/src --include="*.ts" --include="*.tsx"

# Verify AgentTracingCallback not used
grep -r "AgentTracingCallback" extension/src --include="*.ts" --include="*.tsx"

# Verify narrator.md referenced
grep -r "narrator\.md" extension/src/lib/prompts/
```

## Do This Next

1. Run verification commands
2. Delete confirmed unused files
3. Update documentation
4. Update decision document
5. Refactor lib/ai/model.ts
6. Commit as cleanup
7. Test build still passes

---

**Status:** Cleanup identified, ready to execute

