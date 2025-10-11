# Agent Communication Tracing Guide

## Overview

The n8n extension uses a **reactive event-driven architecture** with RxJS for comprehensive agent communication tracing. This allows you to see exactly when agents make decisions, hand off tasks to each other, and track the complete workflow through the multi-agent system.

## 🎯 What You Get

### 1. **Automatic Event Capture**
- **Location**: `extension/src/lib/events/langchain-bridge.ts`
- **Purpose**: Automatically captures all LangGraph events via `.streamEvents()`
- **Integrated with**: LangGraph's streaming API

**Captures:**
- ✅ LLM start/end events
- ✅ Tool executions
- ✅ Agent lifecycle (started, completed)
- ✅ Chain events
- ✅ Error tracking

### 2. **Event-Based Logging**
- **Location**: `extension/src/lib/events/subscribers/logger.ts`
- **Purpose**: Centralized logging of all events

**Features:**
- Structured console output (domain/type/payload)
- All events logged automatically
- Powered by reactive event system
- No scattered debug() calls

### 3. **Tracing Subscriber**
- **Location**: `extension/src/lib/events/subscribers/tracing.ts`
- **Purpose**: Accumulates event history per session
- **Uses**: RxJS `scan` operator

**Features:**
- Complete event history available
- Grouped by session ID
- Access via: `tracing.getTrace(sessionId)`
- Agent flow visualization from events

## 🚀 How to Use

### Automatic Event Capture (Already Active)

The reactive event system automatically captures all operations:

```typescript
// Events are automatically emitted by:
// 1. LangGraph bridge (LLM, tools, agent lifecycle)
// 2. Service code using emitter helpers

// Example: Creating a workflow
async function createWorkflow(data) {
  try {
    const workflow = await n8n.create(data)
    emitWorkflowCreated(workflow, workflow.id)  // ✅ Automatic logging!
  } catch (error) {
    emitApiError(error, 'createWorkflow')        // ✅ Automatic error logging!
  }
}

// All events automatically:
// → Logger logs to console
// → Tracing accumulates history
// → Persistence saves important events
```

### Viewing Events (Console)

**All events are logged automatically:**

```javascript
// Console output format:
[workflow] created - { workflowId: '123', workflow: {...} }
[agent] started - { agent: 'planner', action: 'planning' }
[llm] started - { model: 'gpt-4o-mini' }
[llm] completed - { tokens: { prompt: 100, completion: 50 } }
[agent] completed - { agent: 'planner' }
```

### Accessing Event History

Get complete trace for a session:

```javascript
// In console or debug code
import { getTrace } from './events/subscribers/tracing'

const trace = getTrace('session-id-123')
// Returns: { sessionId, events: [...], startTime, endTime }
```

## 📊 Console Output Examples

### Event Logs (Automatic)
```javascript
// All events logged with this structure:
{
  component: 'agent',              // Domain
  action: 'started',                // Type
  data: {                          // Payload
    agent: 'planner',
    action: 'planning',
    sessionId: 'session-123'
  },
  timestamp: 1697123456789
}
```

### Workflow Lifecycle
```javascript
[workflow] validated - { workflow: {...} }
[workflow] created - { workflowId: '123', workflow: {...} }
// or
[workflow] failed - { workflow: {...}, error: Error(...) }
```

### Agent Lifecycle  
```javascript
[agent] started - { agent: 'planner', action: 'planning' }
[agent] tool_started - { agent: 'executor', tool: 'create_n8n_workflow' }
[agent] tool_completed - { agent: 'executor', tool: 'create_n8n_workflow' }
[agent] completed - { agent: 'planner' }
```

### LLM Events
```javascript
[llm] started - { model: 'gpt-4o-mini', provider: 'openai' }
[llm] completed - { tokens: { prompt: 1234, completion: 567 } }
```

### Error Events
```javascript
[error] api - {
  error: Error('n8n API failed'),
  source: 'createWorkflow',
  userMessage: 'API error in createWorkflow: ...'
}
```

## 🔍 Current Agent Flow

The extension uses LangGraph with reactive event system:

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

