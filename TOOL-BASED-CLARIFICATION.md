# Tool-Based Clarification Architecture

## The Problem We Solved

### Initial Approach: Markers in Response
```typescript
// ❌ LLM output with markers
"Let me know which service! [NEEDS_INPUT]"
```

**Issues**:
1. Markers streamed to UI token-by-token: `[` → `NEEDS` → `_` → `INPUT` → `]`
2. User sees internal implementation details
3. String parsing unreliable
4. Markers appear before we can strip them

---

## The Architectural Solution: Tool Calling

### How It Works

Instead of outputting markers, the LLM **calls a tool** when it needs clarification.

```typescript
// ✅ LLM calls tool (not visible in content stream)
tool_calls: [{
  name: "askClarification",
  args: {
    question: "Which email service would you like to use?"
  }
}]

// Content stream is clean
content: "I can help you set that up!"
```

**Benefits**:
1. ✅ Clean streamed content (no markers)
2. ✅ Structured data (not string parsing)
3. ✅ Follows LangGraph best practices
4. ✅ More reliable (tool schemas vs regex)
5. ✅ Proper separation of content vs actions

---

## Implementation

### 1. Create askClarification Tool

**File**: `extension/src/lib/orchestrator/tools/enrichment.ts`

```typescript
export const askClarificationTool = tool(
  async (input) => {
    const args = input as { question: string }
    return `User will be asked: ${args.question}`
  },
  {
    name: 'askClarification',
    description: 'Ask the user for clarification when you need more information. Ask ONE question at a time.',
    schema: z.object({
      question: z.string().describe('The specific question to ask')
    })
  }
)
```

### 2. Bind Tool to Enrichment Model

**File**: `extension/src/lib/orchestrator/nodes/enrichment.ts`

```typescript
const model = new ChatOpenAI({
  apiKey,
  model: 'gpt-4o-mini',
  temperature: 0.7,
  streaming: true
}).bindTools([askClarificationTool])  // ← Bind the tool
```

### 3. Update System Prompt

Remove marker instructions, add tool guidance:

```markdown
IMPORTANT: You have access to the askClarification tool.

When you need more information:
- Call the askClarification tool with your question
- Ask ONE question at a time
- Only use when you truly need critical information

When you have enough information:
- Respond normally without calling tools
```

### 4. Check for Tool Calls After Response

```typescript
const response = await model.invoke([...])

// Check if LLM called askClarification
const toolCalls = response.tool_calls

if (toolCalls?.length > 0) {
  const askClarCall = toolCalls.find(tc => tc.name === 'askClarification')

  if (askClarCall) {
    const question = askClarCall.args.question

    // Set in state (not streamed to user)
    return new Command({
      goto: 'END',
      update: { clarificationQuestion: question }
    })
  }
}

// No tool call = normal response
return new Command({
  goto: 'END',
  update: { messages: [response] }
})
```

### 5. Orchestrator Detects Clarification Need

**File**: `extension/src/lib/orchestrator/index.ts`

```typescript
const result = await workflowGraph.invoke({...}, config)

// Check state for clarification question
if (result.clarificationQuestion) {
  return {
    response: result.clarificationQuestion,
    needsClarification: result.clarificationQuestion
  }
}

// Normal response
return {
  response: result.messages[result.messages.length - 1].content
}
```

### 6. Background Script Handles Clarification

**File**: `extension/src/background/index.ts`

```typescript
const result = await orchestrator.handle({...}, onToken)

if (result.needsClarification) {
  // Post to UI (no markers visible)
  post({
    type: 'needs_input',
    question: result.needsClarification,
    reason: 'clarification'
  })
  return  // Wait for user response
}

// Normal flow continues...
```

---

## Flow Comparison

### Before (Markers)
```
User: "help with email"
  ↓
Enrichment: Streams "Which service? [NEEDS_INPUT]"
  ↓
UI: Shows "Which service? [NEEDS_INPUT]" ❌ (marker visible!)
  ↓
Parse response, detect marker
  ↓
Strip marker (too late, already shown)
```

### After (Tool Calling)
```
User: "help with email"
  ↓
Enrichment: tool_calls = [{ name: "askClarification", args: {...} }]
  ↓
  content = "I can help with that!"
  ↓
UI: Shows "I can help with that!" ✅ (clean!)
  ↓
Check tool_calls, extract question
  ↓
Set in state: clarificationQuestion = "Which service?"
  ↓
UI: Prompts user for input
```

---

## Why This Is Better

| Aspect | Marker-Based | Tool-Based |
|--------|--------------|------------|
| **User Sees** | Markers in stream ❌ | Clean content ✅ |
| **Reliability** | String parsing ❌ | Structured data ✅ |
| **Streaming** | Marker appears ❌ | Tool call separate ✅ |
| **LangGraph Pattern** | Non-standard ❌ | Proper pattern ✅ |
| **Debugging** | Parse errors ❌ | Schema validation ✅ |

---

## Key Insights

### 1. Tool Calls Happen BEFORE Streaming
When an LLM calls a tool:
- `tool_calls` array is populated in the response object
- `content` may be empty or contain unrelated text
- Tool calls are **not part of the streamed content**
- We can detect and handle them before any markers appear

### 2. LangGraph Auto-Propagates Callbacks
- Callbacks passed to `graph.invoke()` are propagated to all nested runnables
- Don't pass callbacks to `ChatOpenAI` constructor
- Passing them twice = double emissions

### 3. State Fields for Browser Interruption
- `interrupt()` function requires Node.js AsyncLocalStorage
- Impossible to polyfill reliably in browsers
- State fields work everywhere
- Same UX, better compatibility

---

## Testing the Fix

### What You Should See

**Before (With Markers)**:
```
User: "help me with email"
AI: "Which service? [NEEDS_INPUT]"  ← Marker visible ❌
```

**After (With Tools)**:
```
User: "help me with email"
AI: "I can help with that!"  ← Clean ✅
[UI shows input prompt separately]
```

### Console Output

After reloading extension, you should see:
```
🎯 ENRICHMENT NODE CALLED {messageCount: 1}
🤖 Creating ChatOpenAI model {model: 'gpt-4o-mini', streaming: true}
📞 Calling model.invoke()...
🔤 TOKEN: "I"          ← Each token appears ONCE
🔤 TOKEN: " can"
🔤 TOKEN: " help"
📬 Model response received {length: ...}
[Agent:enrichment] Decision: Needs clarification, Tool called for user input
⏸️ Enrichment needs clarification: Which email service?
```

**Key**: No `[NEEDS_INPUT]` in the token stream!

---

## Summary of All Fixes

### Fix 1: Tool-Based Clarification ✅
- **Problem**: Markers appear in UI
- **Solution**: askClarification tool
- **Result**: Clean streamed content

### Fix 2: Remove Callback Duplication ✅
- **Problem**: Tokens emitted twice
- **Solution**: Don't pass callbacks to ChatOpenAI (auto-propagated)
- **Result**: Each token appears once

### Fix 3: Browser-Compatible Interruption ✅
- **Problem**: interrupt() doesn't work in browsers
- **Solution**: Tool calls + state fields
- **Result**: Works in all environments

### Fix 4: Web Accessible Resources ✅
- **Problem**: CSS files denied loading
- **Solution**: Added web_accessible_resources to manifest
- **Result**: Assets load properly

---

## Files Modified

- ✅ `tools/enrichment.ts` - Created askClarification tool
- ✅ `nodes/enrichment.ts` - Bind tool, check tool_calls, remove markers
- ✅ `prompts/agents/enrichment.md` - Document tool usage
- ✅ `orchestrator/index.ts` - Return needsClarification status
- ✅ `orchestrator/state.ts` - Add clarificationQuestion field
- ✅ `background/index.ts` - Handle tool-based clarification

---

**The architectural solution is complete!** 🎯

No more markers, no more duplication, fully browser-compatible.

