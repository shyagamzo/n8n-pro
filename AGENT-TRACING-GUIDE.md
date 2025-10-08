# Agent Communication Tracing Guide

## Overview

The n8n extension now includes comprehensive agent communication tracing using LangChain's built-in callback system. This allows you to see exactly when agents make decisions, hand off tasks to each other, and track the complete workflow through the multi-agent system.

## 🎯 What You Get

### 1. **Automatic LLM Call Tracing**
- **Location**: `extension/src/lib/ai/tracing.ts`
- **Purpose**: Automatically captures all LLM calls via LangChain callbacks
- **Integrated with**: LangChain's `BaseCallbackHandler`

**Captures:**
- ✅ LLM start/end events
- ✅ Token usage (prompt and completion tokens)
- ✅ Response times
- ✅ Error tracking
- ✅ Agent context for each call

### 2. **Agent Decision Logging**
- **Location**: `extension/src/lib/utils/debug.ts` (agent-specific functions)
- **Purpose**: Track when agents make decisions and why

**Features:**
- Color-coded console output by agent type
- Decision reasoning included
- Metadata for context
- Automatic timestamp tracking

### 3. **Agent Handoff Tracking**
- **Purpose**: See when tasks are passed between agents
- **Visualizes**: Agent flow diagrams in console

**Example Output:**
```
🔄 [ORCHESTRATOR → PLANNER] Generate workflow plan from conversation
🔄 [PLANNER → ORCHESTRATOR] Plan ready for user review
```

### 4. **Trace Summary**
- **Purpose**: Complete overview of agent workflow
- **Shows**:
  - Total duration
  - Number of decisions made
  - Number of handoffs
  - LLM call count and tokens used
  - Agent flow visualization

## 🚀 How to Use

### Automatic Tracing (Already Integrated)

The orchestrator now automatically creates traces for all operations:

```typescript
// In orchestrator.plan()
const tracer = createAgentTracer(session.getSessionId())
tracer.setAgent('orchestrator')
tracer.logDecision('Starting plan generation', 'User requested workflow plan')

// Handoff to planner
tracer.logHandoff('planner', 'Generate structured workflow from user requirements')
tracer.setAgent('planner')

// ... plan generation ...

// Complete trace and show summary
tracer.completeTrace()
```

### Manual Tracing (For New Agent Code)

```typescript
import { createAgentTracer } from '../ai/tracing'
import { createOpenAiChatModel } from '../ai/model'

// Create tracer
const tracer = createAgentTracer()
tracer.setAgent('classifier')

// Log decisions
tracer.logDecision(
  'Classified as workflow creation request',
  'User wants to create a new workflow',
  { confidence: 0.95 }
)

// Log handoffs
tracer.logHandoff('enrichment', 'Need more information about trigger')

// Attach to LLM calls
const model = createOpenAiChatModel({
  apiKey: input.apiKey,
  tracer  // LangChain will automatically call trace callbacks
})

// Complete trace
tracer.completeTrace()
```

### Simple Debug Functions

For quick debugging without full trace context:

```typescript
import { debugAgentDecision, debugAgentHandoff } from '../utils/debug'

// Log a decision
debugAgentDecision(
  'planner',
  'Using schedule trigger',
  'User specified daily automation'
)

// Log a handoff
debugAgentHandoff(
  'enrichment',
  'planner',
  'Gathered all required information'
)
```

## 📊 Console Output Examples

### Decision Output
```
🤖 [PLANNER] Decision
   Generating workflow plan
   Reasoning: Using LLM to convert conversation to Loom format
```

### Handoff Output
```
🔄 [ORCHESTRATOR → PLANNER] Generate workflow plan from conversation
```

### LLM Call Output
```
🧠 [PLANNER] LLM Start gpt-4o-mini
✅ [PLANNER] LLM Complete 2341ms (1234→567 tokens)
```

### Trace Summary
```
📊 [TRACE] trace-1234567890
   Duration: 3456ms
   Decisions: 3
   Handoffs: 2
   LLM Calls: 1
   Agent Flow:
      ORCHESTRATOR → PLANNER → ORCHESTRATOR
   Total Tokens: 1801
   Total LLM Time: 2341ms
```

## 🔍 Current Agent Flow

The extension currently implements this simplified flow (full LangGraph implementation coming):

```
User Request
    ↓
ORCHESTRATOR (decides to use planner directly)
    ↓
PLANNER (generates workflow plan)
    ↓
ORCHESTRATOR (returns plan to user)
```

When `isReadyToPlan()` is called:

```
ORCHESTRATOR (checks readiness)
    ↓
ENRICHMENT (simulated - assesses if more info needed)
    ↓
ORCHESTRATOR (returns readiness status)
```

## 🎓 Understanding the Traces

### Agent Types
- **orchestrator**: Coordinates overall flow, routes requests
- **classifier**: Determines user intent (TODO: not yet implemented)
- **enrichment**: Gathers clarifying information (partially implemented)
- **planner**: Generates workflow plans (implemented)
- **executor**: Executes workflow changes (TODO: not yet implemented)

### Trace Data Structure

```typescript
type AgentTrace = {
  traceId: string              // Unique trace identifier
  sessionId: string            // Session this trace belongs to
  startTime: number            // When trace started
  endTime?: number             // When trace completed
  decisions: AgentDecision[]   // All decisions made
  handoffs: AgentHandoff[]     // All agent handoffs
  llmCalls: Array<{            // All LLM calls
    agent: AgentType
    model: string
    promptTokens?: number
    completionTokens?: number
    durationMs: number
    timestamp: number
  }>
}
```

## 🛠️ Development Workflow

### Viewing Traces

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Perform an action** (e.g., request a workflow plan)
4. **Look for colored output**:
   - 🤖 Green = Agent decisions
   - 🔄 Orange = Agent handoffs
   - 🧠 Purple = LLM calls
   - 📊 Blue = Trace summaries

### Example Test Flow

1. Open extension in Chrome
2. Open n8n page
3. Click extension icon
4. Type: "Create a workflow that sends a Slack message every day"
5. Click "Generate Plan"
6. Check console for:
   - Orchestrator decision to use planner
   - Handoff to planner
   - LLM call to generate plan
   - Planner decision (plan generated)
   - Handoff back to orchestrator
   - Final trace summary

## 🔮 Future Enhancements

When LangGraph is fully implemented, traces will show:

```
User Request
    ↓
ORCHESTRATOR
    ↓
CLASSIFIER (determine intent)
    ↓
ENRICHMENT (gather context - may ping-pong with user)
    ↓
PLANNER (create plan)
    ↓
EXECUTOR (apply changes)
    ↓
ORCHESTRATOR (complete)
```

## 📝 Integration with Existing Debug System

The agent tracing system integrates seamlessly with the existing debug infrastructure:

- **DebugSession**: Used for detailed step-by-step logging
- **AgentTracer**: Used for high-level agent communication
- Both systems work together to provide complete visibility

### Example from orchestrator.plan():

```typescript
// Existing debug session
const session = new DebugSession('Orchestrator', 'plan')
session.log('Starting plan generation')

// New agent tracer
const tracer = createAgentTracer(session.getSessionId())
tracer.setAgent('orchestrator')
tracer.logDecision('Starting plan generation', 'User requested workflow plan')

// Both provide complementary views:
// - Session: detailed step-by-step progress
// - Tracer: high-level agent decisions and flow
```

## 🎯 Key Benefits

1. **Debugging**: See exactly where agent decisions happen
2. **Performance**: Track LLM call times and token usage
3. **Flow Visualization**: Understand agent ping-pong behavior
4. **LangGraph Ready**: Built on LangChain callbacks, works seamlessly when LangGraph is added
5. **Zero Overhead**: Only runs in development mode
6. **Automatic**: No manual logging needed for LLM calls

## 🔐 Security

- All traces respect the existing secret sanitization from `debug.ts`
- API keys are automatically masked
- Only runs in development mode
- No data is transmitted externally

---

**Ready to trace!** The system is now active and will automatically log agent communication whenever you use the extension.

