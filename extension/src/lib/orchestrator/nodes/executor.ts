import { Command, END } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { type DebugSession } from '../../utils/debug'
import { executorTools } from '../tools/executor'

/**
 * Executor node creates workflows in n8n via API tools.
 *
 * Uses createReactAgent for automatic tool loop handling:
 * - Bound tools: create_n8n_workflow, check_credentials
 * - ReAct agent handles tool calls internally (no separate tool node needed)
 * - Non-blocking credential checks (workflow created even with missing creds)
 * - Provides setup links for missing credentials
 * - Paused before execution via interruptBefore in graph config
 *
 * Flow:
 * 1. (User approves via interrupt) → executor resumes
 * 2. ReAct agent checks credentials and creates workflow (calls tools internally)
 * 3. Extract results → goto END
 */
export async function executorNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  if (!state.plan)
  {
    throw new Error('No plan to execute')
  }

  const apiKey = config?.configurable?.openai_api_key
  const n8nApiKey = config?.configurable?.n8n_api_key
  const n8nBaseUrl = config?.configurable?.n8n_base_url  // Already defaulted by runGraph()
  const modelName = config?.configurable?.model  // Already defaulted by runGraph()
  const session = config?.metadata?.session as DebugSession | undefined

  if (!apiKey)
  {
    throw new Error('OpenAI API key not provided in config.configurable')
  }

  if (!n8nApiKey)
  {
    throw new Error('n8n API key not provided in config.configurable')
  }

  session?.log('Executing workflow creation', {
    workflowName: state.plan.workflow.name,
    nodeCount: state.plan.workflow.nodes?.length || 0
  })
  
  // Agent lifecycle events automatically emitted by LangGraph bridge
  // (on_chain_start → emitAgentStarted('executor', 'executing'))

  // Create ReAct agent with executor tools
  const systemPrompt = new SystemMessage(`You are the workflow executor for n8n. Your job is to:

1. Check if required credentials exist using the check_credentials tool
2. Create the workflow using the create_n8n_workflow tool
3. Report back with the workflow URL and any missing credentials

Important:
- Create the workflow EVEN IF some credentials are missing (users can set them up later)
- Provide clear setup links for any missing credentials
- Be concise in your response to the user

You have access to these tools:
- check_credentials: Check which credentials exist and which are missing
- create_n8n_workflow: Create the workflow in n8n

Use the tools to complete the task.`)

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.1
    }),
    tools: executorTools,
    messageModifier: systemPrompt
  })

  const executionRequest = new HumanMessage(`Execute this workflow plan:

Workflow: ${state.plan.workflow.name}
Nodes: ${state.plan.workflow.nodes?.length || 0}
Required Credentials: ${state.plan.credentialsNeeded?.map(c => c.type).join(', ') || 'none'}

n8n API Key: ${n8nApiKey}
n8n Base URL: ${n8nBaseUrl}

First check credentials, then create the workflow. Respond to the user with the result.`)

  // ReAct agent handles tool loop internally
  const result = await agent.invoke(
    { messages: [...state.messages, executionRequest] },
    config
  )

  // Extract results from agent response
  const lastMessage = result.messages[result.messages.length - 1]
  const content = lastMessage.content as string

  // Try to extract workflow ID and credential info from the message history
  const workflowId = extractWorkflowId(content, result.messages)
  const credentialGuidance = extractCredentialGuidance(content)

  session?.log('Workflow created successfully', { workflowId })
  
  // Agent completion event automatically emitted by LangGraph bridge
  // (on_chain_end → emitAgentCompleted('executor'))
  // Workflow created event emitted by background worker after applyWorkflow()

  return new Command({
    goto: END,
    update: {
      workflowId,
      credentialGuidance,
      messages: result.messages
    }
  })
}

/**
 * Extract workflow ID from tool results in message history.
 */
function extractWorkflowId(_content: string, messages: any[]): string | undefined
{
  // Look for workflow ID in recent tool messages
  for (let i = messages.length - 1; i >= Math.max(0, messages.length - 10); i--)
  {
    const msg = messages[i]
    if (msg.type === 'tool' && msg.content)
    {
      try
      {
        const parsed = JSON.parse(msg.content)
        if (parsed.id)
        {
          return parsed.id
        }
      }
      catch
      {
        // Not JSON, skip
      }
    }
  }

  // Fallback: try to extract from _content
  const idMatch = _content.match(/workflow.*?['"]([\w-]+)['"]|id['"]\s*:\s*['"]([\w-]+)['"]/i)
  return idMatch?.[1] || idMatch?.[2]
}

/**
 * Extract credential guidance from tool results.
 */
function extractCredentialGuidance(_content: string): OrchestratorStateType['credentialGuidance']
{
  // This would be populated by the check_credentials tool result
  // For now, return undefined - the tool messages will have the data
  return undefined
}

