# Streaming Fix Summary

## Problem

The planner's raw Loom output (including "validation: status: valid") was being streamed to the user and appearing in the same message bubble as the enrichment agent's conversational response.

### Example of the Bug

```
I've gathered all the necessary information for your workflow...

``` validation: status: valid

summary: Sends a joke email every morning at 8 AM to shyagam@gmail.com...
workflow:
  name: Daily Joke Email
  nodes:
    - id: Schedule
      type: n8n-nodes-base.scheduleTrigger
      ...
```

The user sees BOTH:
1. The enrichment agent's conversational message
2. The planner's raw Loom output

This is confusing because the workflow plan should appear separately in the `<PlanMessage>` component, not as raw text in the chat.

## Root Cause

All agents (enrichment, planner, validator, executor) had `streaming: true` enabled by default. This meant:

1. **Enrichment agent** streams: "I've gathered all the necessary information..."
2. **Planner agent** streams: "validation: status: valid\nsummary: ...\nworkflow: ..."
3. Both outputs are concatenated into the same message via the `handleToken()` callback
4. The UI displays this combined text in one message bubble

The `TokenStreamHandler` in `extension/src/ai/orchestrator/streaming.ts` sends ALL tokens from ALL agents to the UI through the same callback, and the UI appends them all to the same streaming message.

## Solution

Disabled token streaming for agents that work "behind the scenes":

### Changed Files

1. **`extension/src/ai/orchestrator/nodes/planner.ts`** (line 65)
   ```typescript
   llm: new ChatOpenAI({
     streaming: false  // Planner works silently - no token streaming to user
   })
   ```

2. **`extension/src/ai/orchestrator/tools/validator-tool.ts`** (line 49)
   ```typescript
   llm: new ChatOpenAI({
     streaming: false  // Validator works silently - no token streaming
   })
   ```

3. **`extension/src/ai/orchestrator/nodes/executor.ts`** (line 69)
   ```typescript
   llm: new ChatOpenAI({
     streaming: false  // Executor works silently - no token streaming to user
   })
   ```

### Agent Streaming Configuration

| Agent | Streaming | Reason |
|-------|-----------|--------|
| **Enrichment** | `true` ✅ | Conversational agent - user should see responses stream in |
| **Planner** | `false` ❌ | Works silently - output is parsed into plan object |
| **Validator** | `false` ❌ | Tool only - not user-facing |
| **Executor** | `false` ❌ | Creates workflow silently - user sees success toast |

## Result

### Before
```
User message bubble:
  "Send me a joke email every morning..."

Assistant message bubble:
  "I've gathered all the necessary information...
  ``` validation: status: valid
  summary: ...
  workflow:
    nodes: ..."
```

### After
```
User message bubble:
  "Send me a joke email every morning..."

Assistant message bubble:
  "I've gathered all the necessary information..."

  [Plan Preview Component showing the workflow]
```

## Testing

Build succeeded ✅

### To Test:

1. **Reload extension** in Chrome at `chrome://extensions/`
2. **Start new chat** and request: "Send me a joke email every morning at 8 AM"
3. **Verify**:
   - Enrichment agent message: "I've gathered all the necessary information..." (conversational)
   - NO raw Loom output in the message
   - NO "validation: status: valid" visible
   - Plan appears separately in `<PlanMessage>` component
   - Clean separation between conversation and workflow preview

## Related Issues Fixed

This change also fixes the issues from `VALIDATOR-FIX-SUMMARY.md`:
- Validator now properly validates with complete node type list
- Planner iterates with validator internally without exposing validation output to user
- Clean user experience with proper message separation

## Implementation Notes

The streaming architecture works as follows:

1. **LangChain Callback System**: `TokenStreamHandler` listens to all LLM token emissions
2. **Background Worker**: Passes tokens to UI via `post({ type: 'token', token })`
3. **Chat Service**: Appends all tokens to the same streaming message
4. **Solution**: Disable streaming for non-conversational agents at the source (LLM config)

This is the cleanest solution because:
- No changes needed to the token streaming infrastructure
- Each agent controls its own streaming behavior
- Enrichment agent continues to provide real-time conversational feedback
- Other agents work silently and only expose their structured outputs (plan, workflow ID, etc.)

