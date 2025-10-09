<!-- 48753cd0-0fa9-4ca1-8eb8-7dd73ce0be7c 524f180f-f9e0-4c44-8c5a-7bcd158990c9 -->
# LangGraph Multi-Agent Session-Based Architecture

## Core Architecture Principles

1. **Single Entrypoint**: All messages → Orchestrator (LangGraph graph)
2. **Thread Lifecycle**: One graph instance per thread with thread_id (LangGraph's persistence key)
3. **Full LangChain Integration**: Use LangGraph StateGraph, checkpointers, memory, tools
4. **Separation of Concerns**: UI in background/content, logic in orchestrator graph

## Git Workflow During Migration

- **Small, focused commits**: Each phase = separate commit
- **Commit format**: `♻️ Phase N: [description]` (e.g., `♻️ Phase 2: Define LangGraph state schema`)
- **Build verification**: Run `yarn build` before each commit
- **Incremental testing**: Test after each major phase (2, 5, 6, 7)
- **Preserve history**: No force pushes, no squashing during development
- **Rollback safety**: Each commit should be a working state or clearly marked WIP

## Phase 1: Branch & Dependencies

### Branch Management

- Merge `🐛/workflow/creation-errors` → `master`
- Delete old branch
- Create `♻️/langgraph-architecture`

### Verify Dependencies

```bash
yarn list --pattern "@langchain"
```

Ensure we have: `@langchain/langgraph`, `@langchain/core`, `@langchain/openai`

## Phase 2: Define Session-Based State

**File:** `extension/src/lib/orchestrator/state.ts`

```typescript
import { Annotation } from '@langchain/langgraph'
import type { BaseMessage } from '@langchain/core/messages'
import type { Plan } from '../types/plan'

export const OrchestratorState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y)
  }),
  sessionId: Annotation<string>(),
  plan: Annotation<Plan | undefined>(),
  validationErrors: Annotation<string[]>(),
  needsMoreInfo: Annotation<boolean>(),
  nextAgent: Annotation<'supervisor' | 'enrichment' | 'planner' | 'validator' | 'done'>()
})

export type OrchestratorStateType = typeof OrchestratorState.State
```

## Phase 3: Create LangGraph Nodes

### Supervisor Node (Router)

**File:** `extension/src/lib/orchestrator/nodes/supervisor.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai'
import type { OrchestratorStateType } from '../state'

export async function supervisorNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
  const model = new ChatOpenAI({ modelName: 'gpt-4' })
  
  const systemPrompt = `You are a supervisor routing user requests.
  - If user is chatting/asking questions → route to 'enrichment'
  - If user wants workflow and we have enough info → route to 'planner'
  - If we need more info → route to 'enrichment'
  - After planner → route to 'validator'
  - After validator → route to 'done'`
  
  const response = await model.invoke([
    { role: 'system', content: systemPrompt },
    ...state.messages
  ])
  
  // Parse response to determine next agent
  const nextAgent = parseRoutingDecision(response.content)
  
  return { nextAgent }
}
```

### Enrichment Node (Chat & Requirements)

**File:** `extension/src/lib/orchestrator/nodes/enrichment.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai'
import { buildPrompt } from '../../prompts'
import type { OrchestratorStateType } from '../state'

export async function enrichmentNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    streaming: true, // LangGraph handles streaming!
    callbacks: state.callbacks // Passed from invoke()
  })
  
  const systemPrompt = buildPrompt('enrichment', {
    includeNodesReference: true,
    includeConstraints: true
  })
  
  const response = await model.invoke([
    { role: 'system', content: systemPrompt },
    ...state.messages
  ])
  
  return {
    messages: [response],
    needsMoreInfo: !isReadyToPlan(response.content)
  }
}
```

### Planner Node (Workflow Generation)

**File:** `extension/src/lib/orchestrator/nodes/planner.ts`

Uses existing prompts, Loom parsing, bound with n8n tools

### Validator Node (Deep Validation)

**File:** `extension/src/lib/orchestrator/nodes/validator.ts`

Uses existing validation logic, n8n API tools

## Phase 4: Define n8n API Tools

**File:** `extension/src/lib/orchestrator/tools.ts`

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { fetchNodeTypes } from '../n8n/node-types'
import { validateWorkflow } from '../validation/workflow'

export const n8nTools = [
  new DynamicStructuredTool({
    name: 'fetch_n8n_node_types',
    description: 'Get available n8n node types and their parameters',
    schema: z.object({ baseUrl: z.string().optional() }),
    func: async ({ baseUrl }) => {
      const types = await fetchNodeTypes({ baseUrl })
      return JSON.stringify(types)
    }
  }),
  
  new DynamicStructuredTool({
    name: 'validate_n8n_workflow',
    description: 'Validate workflow structure against n8n schema',
    schema: z.object({ workflow: z.any() }),
    func: async ({ workflow }) => {
      const result = validateWorkflow(workflow)
      return JSON.stringify(result)
    }
  })
]
```

Bind tools to planner and validator agents.

## Phase 5: Build StateGraph with Session Support

**File:** `extension/src/lib/orchestrator/graph.ts`

```typescript
import { StateGraph, MemorySaver, END } from '@langchain/langgraph'
import { OrchestratorState } from './state'
import { supervisorNode, enrichmentNode, plannerNode, validatorNode } from './nodes'

// Create graph with state definition
const graph = new StateGraph(OrchestratorState)

// Add nodes
graph.addNode('supervisor', supervisorNode)
graph.addNode('enrichment', enrichmentNode)
graph.addNode('planner', plannerNode)
graph.addNode('validator', validatorNode)

// Define routing
graph.addEdge('__start__', 'supervisor')
graph.addConditionalEdges(
  'supervisor',
  (state) => state.nextAgent,
  {
    enrichment: 'enrichment',
    planner: 'planner',
    validator: 'validator',
    done: END
  }
)

// All nodes return to supervisor for routing
graph.addEdge('enrichment', 'supervisor')
graph.addEdge('planner', 'supervisor')
graph.addEdge('validator', 'supervisor')

// Compile with memory for session persistence
const checkpointer = new MemorySaver() // In-memory per session
export const workflowGraph = graph.compile({ checkpointer })
```

## Phase 6: Create Session-Based Orchestrator

**File:** `extension/src/lib/orchestrator/index.ts`

```typescript
import { v4 as uuid } from 'uuid'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { workflowGraph } from './graph'
import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'

export class ChatOrchestrator {
  private threadId: string
  
  constructor(sessionId?: string) {
    this.threadId = sessionId || uuid()
  }
  
  async processMessage(
    message: ChatMessage,
    apiKey: string,
    onToken?: (token: string) => void
  ): Promise<{ response: string; plan?: Plan }> {
    
    const config = {
      configurable: { thread_id: this.threadId },
      callbacks: onToken ? [new TokenStreamHandler(onToken)] : []
    }
    
    const result = await workflowGraph.invoke(
      {
        messages: [new HumanMessage(message.text)],
        sessionId: this.threadId
      },
      config
    )
    
    const lastMessage = result.messages[result.messages.length - 1]
    
    return {
      response: lastMessage.content,
      plan: result.plan
    }
  }
  
  getSessionId(): string {
    return this.threadId
  }
}
```

## Phase 7: Integrate with Background Script

**File:** `extension/src/background/index.ts`

```typescript
import { ChatOrchestrator } from '../lib/orchestrator'

// Session management: one orchestrator per chat panel
const sessions = new Map<number, ChatOrchestrator>() // portId → orchestrator

chrome.runtime.onConnect.addListener((port) => {
  const orchestrator = new ChatOrchestrator()
  sessions.set(port.sender?.tab?.id || 0, orchestrator)
  
  port.onMessage.addListener(async (msg: ChatRequest) => {
    const post = createSafePost(port)
    const apiKey = await getOpenAiKey()
    
    if (msg.type === 'chat') {
      const { response, plan } = await orchestrator.processMessage(
        msg.message,
        apiKey,
        (token) => post({ type: 'token', token })
      )
      
      if (plan) {
        // Workflow was created, handle it
        post({ type: 'plan_generated', plan })
      }
    }
  })
  
  port.onDisconnect.addListener(() => {
    sessions.delete(port.sender?.tab?.id || 0)
  })
})
```

## Phase 8: Token Streaming Handler

**File:** `extension/src/lib/orchestrator/streaming.ts`

```typescript
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'

export class TokenStreamHandler extends BaseCallbackHandler {
  name = 'token_stream_handler'
  
  constructor(private onToken: (token: string) => void) {
    super()
  }
  
  async handleLLMNewToken(token: string) {
    this.onToken(token)
  }
}
```

## Phase 9: Clean Up Legacy Code

Remove:

- `extension/src/lib/orchestrator/agents/` (old agent files)
- `extension/src/lib/orchestrator/plan-converter.ts`
- `extension/src/lib/orchestrator/narration.ts`
- Old orchestrator class implementation

Keep and reuse:

- `extension/src/lib/prompts/` (use in nodes)
- `extension/src/lib/validation/` (use in validator node)
- `extension/src/lib/loom/` (use in planner node)
- `extension/src/lib/n8n/` (use in tools)

## Phase 10: Testing

### Session Persistence Test

1. Start chat session
2. Send message "help me with email"
3. Send message "send to john@example.com daily"
4. Verify state maintained across messages

### Workflow Generation Test

1. Provide complete requirements
2. Verify supervisor routes to planner
3. Verify planner → validator flow
4. Check workflow created successfully

### Token Streaming Test

1. Send chat message
2. Verify letter-by-letter streaming in UI
3. Check no delays or buffering

## Success Criteria

- ✅ Single orchestrator entrypoint handles all messages
- ✅ LangGraph manages session state with thread_id
- ✅ Token-by-token streaming works via LangChain callbacks
- ✅ Supervisor routes correctly based on context
- ✅ n8n tools integrated into agents
- ✅ Session persists across multiple messages
- ✅ UI code separated from LLM logic
- ✅ ~70% less custom orchestration code

### To-dos

- [ ] Merge current branch, create new refactor branch
- [ ] Define LangGraph state with Annotation API
- [ ] Create supervisor node for routing decisions
- [ ] Create enrichment, planner, validator nodes
- [ ] Define n8n API tools for agents
- [ ] Build StateGraph with checkpointer for sessions
- [ ] Create ChatOrchestrator with session management
- [ ] Integrate orchestrator with background script sessions
- [ ] Implement token streaming callback handler
- [ ] Remove legacy code and refactor reusable parts
- [ ] Test session persistence, routing, and streaming