# Narrator Integration Example

This shows how to integrate the parallel narrator agent into the orchestrator.

## Example: Planner with Narrator

```typescript
import { narrateAndExecute } from '../services/narrator'
import { v4 as uuidv4 } from 'uuid'

// In orchestrator plan() method
public async plan(input: OrchestratorInput): Promise<Plan>
{
  const session = new DebugSession('Orchestrator', 'plan')
  session.log('Starting plan generation', { messageCount: input.messages.length })

  // Extract user intent for narrator context
  const userIntent = input.messages[input.messages.length - 1].text

  // Run planner WITH parallel narration
  const plan = await narrateAndExecute(
    {
      agent: 'planner',
      action: 'designing workflow',
      userIntent,
      phase: 'started'
    },
    input.apiKey,
    async () => {
      // This is the actual planner work
      const systemPrompt = buildPrompt('planner', {
        includeNodesReference: true,
        includeWorkflowPatterns: true,
        includeConstraints: true,
      })

      const messagesWithSystem: ChatMessage[] = [
        { id: 'system', role: 'system', text: systemPrompt },
        ...input.messages,
        { id: 'plan-request', role: 'user', text: 'Generate workflow plan...' }
      ]

      const model = createOpenAiChatModel({ apiKey: input.apiKey })
      const loomResponse = await model.generateText(messagesWithSystem)
      
      const cleanedResponse = stripCodeFences(loomResponse)
      const parsed = parseLoom(cleanedResponse)
      
      if (!parsed.success || !parsed.data) {
        throw new Error('Failed to parse Loom response')
      }

      return this.loomToPlan(parsed.data)
    },
    (narration) => {
      // This callback is called as soon as narration is ready (0.5-1s)
      // Post it immediately to show user what's happening
      post({ 
        type: 'agent_activity',
        agent: 'planner',
        activity: narration,
        status: 'started',
        id: uuidv4(),
        timestamp: Date.now()
      })
    }
  )

  // Plan is ready, send completion activity
  post({
    type: 'agent_activity',
    agent: 'planner',
    activity: '✅ Workflow design complete!',
    status: 'complete',
    id: uuidv4(),
    timestamp: Date.now()
  })

  return plan
}
```

## Example: Validator with Narrator

```typescript
// In the validator section
try {
  // Start narration in parallel
  const validationPromise = narrateAndExecute(
    {
      agent: 'validator',
      action: 'checking workflow structure',
      phase: 'started'
    },
    input.apiKey,
    async () => {
      const [n8nApiKey, baseUrl] = await Promise.all([getN8nApiKey(), getBaseUrl()])
      const nodeTypes = await fetchNodeTypes({ baseUrl, apiKey: n8nApiKey })
      
      return await validatePlan({
        apiKey: input.apiKey,
        plan,
        nodeTypes
      })
    },
    (narration) => {
      post({
        type: 'agent_activity',
        agent: 'validator',
        activity: narration,
        status: 'started',
        id: uuidv4(),
        timestamp: Date.now()
      })
    }
  )

  const validatorResult = await validationPromise

  if (!validatorResult.valid) {
    // Error activity
    post({
      type: 'agent_activity',
      agent: 'validator',
      activity: '🫣 Found issues, fixing them...',
      status: 'error',
      id: uuidv4(),
      timestamp: Date.now()
    })
    
    throw new Error('Validation failed')
  }

  // Success activity
  post({
    type: 'agent_activity',
    agent: 'validator',
    activity: '✅ Validation passed!',
    status: 'complete',
    id: uuidv4(),
    timestamp: Date.now()
  })
}
catch (error) {
  // Handle error...
}
```

## Example: Executor with Step-by-Step Narration

```typescript
// When executor creates workflow
post({
  type: 'agent_activity',
  agent: 'executor',
  activity: '🚀 Creating your workflow...',
  status: 'started',
  id: uuidv4(),
  timestamp: Date.now()
})

// As each node is added
for (const node of workflow.nodes) {
  const narration = await narrateAgentActivity({
    agent: 'executor',
    action: `adding ${node.type.split('.').pop()} node`,
    phase: 'working'
  }, apiKey)

  post({
    type: 'agent_activity',
    agent: 'executor',
    activity: narration,  // e.g., "➕ Adding Gmail node..."
    status: 'working',
    id: uuidv4(),
    timestamp: Date.now()
  })
  
  // Actually create the node
  await createNode(node)
}

// Final success
post({
  type: 'agent_activity',
  agent: 'executor',
  activity: '✅ Workflow created successfully!',
  status: 'complete',
  id: uuidv4(),
  timestamp: Date.now()
})
```

## Timeline Comparison

### Without Narrator:
```
0s:  User clicks create
0s:  [silence...]
0s:  [silence...]
3s:  [silence...]
5s:  ✅ Workflow created!
```

### With Parallel Narrator:
```
0s:  User clicks create
0.5s: 📝 Designing your workflow...    <- Narration arrives fast!
1s:  [planner still working...]
3s:  [planner still working...]
5s:  ✅ Workflow design complete!
5.2s: ✔️ Validating structure...        <- Next narration
6s:  ✅ Validation passed!
6.2s: 🚀 Creating workflow...
7s:  ✅ Workflow created!
```

## Key Benefits

1. **Immediate Feedback**: Narration shows in 0.5-1s (vs 5s for actual work)
2. **Parallel Execution**: No performance impact (runs alongside main work)
3. **Contextual Messages**: LLM generates relevant, friendly messages
4. **Fallback Safety**: If narration fails, uses template-based fallback
5. **Cost Efficient**: gpt-4o-mini is ~$0.0001 per narration

## UI Integration

The UI would handle `agent_activity` messages and display them in an activity panel:

```typescript
// In ChatContainer or similar
{messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}

<AgentActivityPanel 
  activities={activities.filter(a => a.status !== 'complete')} 
/>

<ChatInput />
```

## Next Steps

1. ✅ Created narrator agent prompt
2. ✅ Built narrator service with parallel execution
3. ✅ Added agent_activity message type
4. ⏳ Integrate into orchestrator
5. ⏳ Build UI components (AgentActivityPanel, AgentActivityItem)
6. ⏳ Add to chat store
7. ⏳ Test end-to-end

