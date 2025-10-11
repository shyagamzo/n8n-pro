# Reactive Architecture - Manual Testing Guide

## How to Test the Event System

Since the project doesn't have Jest configured yet, use manual testing to verify the reactive architecture works correctly.

## Setup

```bash
cd extension
yarn build
# Load extension in Chrome (chrome://extensions → Load unpacked → select dist/)
# Open n8n at localhost:5678
```

## Test 1: Event Logging

**What to test:** Logger subscriber logs all events

**Steps:**
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Click the n8n Assistant button
4. Send a message: "Create a workflow that sends email daily"
5. Click "Generate Plan"

**Expected output in console:**
```
[workflow] created - {...}
[agent] started - { agent: 'planner', action: 'planning' }
[llm] started - { model: 'gpt-4o-mini' }
[llm] completed - { tokens: {...} }
[agent] completed - { agent: 'planner' }
[agent] started - { agent: 'executor' }
[agent] completed - { agent: 'executor' }
```

**What to verify:**
- ✅ Events are logged with proper structure
- ✅ Domain/type/payload are correct
- ✅ No duplicate logs
- ✅ Timestamps are present

## Test 2: Error Event Handling

**What to test:** Errors flow through event system

**Steps:**
1. Remove your n8n API key (Options page)
2. Try to create a workflow
3. Check console

**Expected output:**
```
[error] api - { error: 'n8n API key not set', source: 'handleApplyPlan' }
```

**What to verify:**
- ✅ Error event logged
- ✅ User sees error message in UI
- ✅ Error details are present

## Test 3: Workflow Creation Flow

**What to test:** Complete workflow creation emits proper events

**Steps:**
1. Ensure API keys are configured
2. Create a simple workflow
3. Approve the plan
4. Check console for event sequence

**Expected sequence:**
```
1. [agent] started - planner
2. [llm] started
3. [llm] completed
4. [agent] completed - planner
5. [agent] started - validator (if used)
6. [agent] completed - validator
7. [agent] started - executor
8. [workflow] created
9. [agent] completed - executor
```

**What to verify:**
- ✅ Correct event order
- ✅ All agent lifecycle events captured
- ✅ Workflow creation event emitted
- ✅ No missing events

## Test 4: Event Tracing

**What to test:** Tracing subscriber accumulates events

**Steps:**
1. Open DevTools console
2. Create a workflow
3. After completion, run in console:
```javascript
// Access tracing subscriber
chrome.runtime.sendMessage({ type: 'get_trace', sessionId: 'your-session-id' })
```

**Expected:**
- Event history available for inspection
- Events grouped by session
- Complete trace of agent flow

**What to verify:**
- ✅ Events are accumulated
- ✅ Trace includes all events
- ✅ SessionId grouping works

## Test 5: Subscriber Cleanup

**What to test:** Subscriptions clean up properly

**Steps:**
1. Open n8n, use assistant
2. Close the tab
3. Check console for cleanup messages

**Expected output:**
```
[logger] Subscription cleaned up
[tracing] Subscription cleaned up
[persistence] Subscription cleaned up
```

**What to verify:**
- ✅ All subscribers cleanup
- ✅ No memory leaks
- ✅ No subscription errors

## Test 6: Multiple Subscribers

**What to test:** shareReplay() prevents duplicate work

**Steps:**
1. Create workflow
2. Check console logs

**What to verify:**
- ✅ Only ONE instance of each event logged (not duplicated)
- ✅ Logger, tracing, persistence all receive same event
- ✅ No duplicate API calls or processing

## Test 7: Error Recovery

**What to test:** System handles subscriber errors gracefully

**Steps:**
1. Intentionally break a subscriber (add throw in logger.ts)
2. Try to create workflow
3. Check console

**Expected:**
- Error event emitted for subscriber failure
- Other subscribers continue working
- System doesn't crash

**What to verify:**
- ✅ Subscriber errors are caught
- ✅ Error events emitted
- ✅ Other subscribers unaffected

## Debugging Tips

### View All Events
```javascript
// In console
systemEvents.eventStream.subscribe(e => console.log('EVENT:', e))
```

### View Specific Domain
```javascript
// Workflow events only
systemEvents.workflow$.subscribe(e => console.log('WORKFLOW:', e))
```

### Check Subscription Count
```javascript
// Number of active subscriptions (if exposed)
// Should be 3 (logger, tracing, persistence) in background context
```

## Performance Testing

### High-Volume Events

**Test:** Create complex workflow with many nodes

**What to verify:**
- ✅ Event processing is fast (< 1ms per event)
- ✅ No lag in UI
- ✅ Memory usage is stable
- ✅ No observable buffer overflow

### Debouncing

**Test:** Rapid events (agent activity)

**What to verify:**
- ✅ Activity updates are debounced (50ms)
- ✅ Not every single event creates UI update
- ✅ Final state is correct

## Success Criteria

✅ All events logged properly
✅ No duplicate events
✅ No errors in console (except expected errors)
✅ UI updates work correctly
✅ Cleanup happens on tab close
✅ No memory leaks
✅ Performance is acceptable

## Known Issues to Ignore

1. **Lint warnings** - Pre-existing, not from reactive architecture
2. **Bundle size warning** - Pre-existing
3. **Chat/Activity subscribers inactive** - Expected (wrong context)

## If Something Doesn't Work

1. Check DevTools console for errors
2. Verify subscribers are initialized (should see setup logs)
3. Check event emission (add console.log in emitter)
4. Verify subscription (add tap() operator)
5. Check Chrome extension context (background vs content)

## Next Steps After Testing

Once manual testing passes:
1. Create PR to merge branch
2. Document any issues found
3. Plan future enhancements (event forwarding, additional subscribers)

---

**Test thoroughly and report any issues!** 🧪

