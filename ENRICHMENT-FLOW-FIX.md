# Enrichment Flow Fix

## Problem
The assistant was generating workflow plans on **every message**, even when asking the user for more information. This created a confusing UX where:
- User: "I want to automate Slack"
- Assistant: "What would you like to do with Slack?" (asks question)
- **BUT ALSO shows a "Create Workflow" button with incomplete plan**

This violated the multi-agent architecture which should follow:
```
Classifier → Enrichment → Planner → Executor
```

## Root Cause
In `/extension/src/background/index.ts`, the `handleChat` function **unconditionally called `orchestrator.plan()`** on every message:

```typescript
// OLD CODE - Always generates plan
async function handleChat(msg: ChatRequest, post: (m: BackgroundMessage) => void): Promise<void>
{
  const apiKey = await getOpenAiKey()

  // This ALWAYS runs, even during enrichment phase
  const plan = await orchestrator.plan({ apiKey, messages: msg.messages })
  post({ type: 'plan', plan })

  // Then also generates conversational response
  const reply = await orchestrator.handle({ apiKey, messages: msg.messages })
  // ...
}
```

## Solution

### 1. Added Readiness Check (`orchestrator.isReadyToPlan()`)
New method that asks the LLM if we have enough information to generate a complete workflow:

```typescript
public async isReadyToPlan(input: OrchestratorInput): Promise<{ ready: boolean; reason?: string }>
{
  const readinessCheck: ChatMessage = {
    id: 'readiness-check',
    role: 'user',
    text: 'Based on our conversation, do we have enough information to create a complete workflow? ' +
          'Answer with just "READY" if we have all necessary details (trigger type, actions, services, etc.), ' +
          'or "NOT_READY: [what\'s missing]" if we need more information.',
  }

  const response = await model.generateText(messagesWithSystem)
  const isReady = response.trim().toUpperCase().startsWith('READY')

  return {
    ready: isReady,
    reason: isReady ? undefined : response.replace(/^NOT_READY:\s*/i, '').trim()
  }
}
```

### 2. Refactored `handleChat` to Conditional Plan Generation

```typescript
// NEW CODE - Only generates plan when ready
async function handleChat(msg: ChatRequest, post: (m: BackgroundMessage) => void): Promise<void>
{
  const apiKey = await getOpenAiKey()

  // Step 1: Check if we have enough information
  const readiness = await orchestrator.isReadyToPlan({ apiKey, messages: msg.messages })
  console.log('🔍 Readiness check:', readiness)

  // Step 2: Generate conversational response (always happens)
  const reply = await orchestrator.handle({ apiKey, messages: msg.messages }, onToken)
  post({ type: 'token', token: reply })

  // Step 3: Only generate plan if ready
  if (readiness.ready)
  {
    console.log('✅ Ready to plan - generating workflow')
    const plan = await orchestrator.plan({ apiKey, messages: msg.messages })
    post({ type: 'plan', plan })
  }
  else
  {
    console.log('⏳ Not ready to plan yet:', readiness.reason)
    // No plan sent - assistant is still gathering requirements
  }

  post({ type: 'done' })
}
```

### 3. UI Already Supported Optional Plans
The UI was already built correctly:
- `ChatMessage` type has `plan?: Plan` (optional)
- `MessageBubble` component: `{message.plan && <PlanMessage plan={message.plan} />}`
- No changes needed!

## Result

### Before (Broken)
```
User: "I want to automate Slack"
Assistant: "What would you like to do with Slack?"
UI: Shows "Create Workflow" button ❌ (plan with incomplete info)
```

### After (Fixed)
```
User: "I want to automate Slack"
Readiness: NOT_READY (missing action, trigger)
Assistant: "What would you like to do with Slack?"
UI: Only shows question, NO button ✅

User: "Send a message to #general every day at 9am"
Readiness: READY (has all info)
Assistant: "I'll create a workflow that sends..."
UI: Shows "Create Workflow" button ✅ (complete plan)
```

## Flow Diagram

### Enrichment Phase
```
User Request
    ↓
handleChat()
    ↓
isReadyToPlan() → NOT_READY
    ↓
orchestrator.handle() → Ask clarifying question
    ↓
Send conversational response (NO PLAN)
    ↓
UI shows assistant question
```

### Planning Phase
```
User Provides Details
    ↓
handleChat()
    ↓
isReadyToPlan() → READY ✅
    ↓
orchestrator.handle() → Conversational response
orchestrator.plan() → Generate workflow
    ↓
Send response + plan
    ↓
UI shows assistant response + "Create Workflow" button
```

## Console Output

### Enrichment Phase
```
💬 Handling chat message: { messageCount: 2 }
🔍 Readiness check: { ready: false, reason: "Missing trigger type and specific action" }
⏳ Not ready to plan yet: Missing trigger type and specific action
```

### Planning Phase
```
💬 Handling chat message: { messageCount: 4 }
🔍 Readiness check: { ready: true }
✅ Ready to plan - generating workflow
[Orchestrator] plan
  +0ms Starting plan generation
  ...
📋 Plan generated and sent: { title: "Daily Slack Message" }
```

## Benefits

1. **Follows Architecture** - Multi-agent flow works as designed
2. **Better UX** - No confusing plans during enrichment
3. **Cleaner Chat** - Plans only appear when meaningful
4. **Debuggable** - Console shows readiness decisions
5. **Flexible** - Easy to adjust readiness criteria

## Files Changed

- `/extension/src/lib/orchestrator/index.ts`
  - Added `isReadyToPlan()` method

- `/extension/src/background/index.ts`
  - Refactored `handleChat()` to check readiness first
  - Conditional plan generation
  - Enhanced console logging

- `/extension/src/lib/types/chat.ts` (no changes needed)
  - Plan was already optional

- `/extension/src/lib/components/MessageBubble.tsx` (no changes needed)
  - Already handles optional plans correctly

## Testing

To test the enrichment flow:

1. **Start with vague request:**
   ```
   User: "I want to automate something"
   Expected: Question, NO plan button
   ```

2. **Provide partial info:**
   ```
   User: "Send Slack messages"
   Expected: More questions, NO plan button
   ```

3. **Provide complete info:**
   ```
   User: "Every day at 9am to #general saying 'Good morning'"
   Expected: Response + plan button appears ✅
   ```

4. **Check console for readiness logs:**
   ```
   🔍 Readiness check: { ready: false, reason: "..." }
   🔍 Readiness check: { ready: true }
   ```

## Future Improvements

Potential enhancements:
- **Cache readiness checks** - Avoid re-checking if conversation hasn't changed significantly
- **Confidence scores** - Show readiness percentage
- **Explicit enrichment agent** - Use dedicated enrichment prompt (currently using planner prompt)
- **User override** - Allow users to force plan generation ("create it anyway")

