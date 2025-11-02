// ==========================================
// Imports
// ==========================================

import { Command, END } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { BaseMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '@ai/orchestrator/state'
import { extractExecutorConfig } from '@ai/orchestrator/config'
import { executorTools } from '@ai/orchestrator/tools/executor'
import { buildPrompt, buildRequest } from '@ai/prompts'
import { findLastToolResult } from '@shared/utils/langchain-messages'
import { emitApiError } from '@events/emitters'
import { withTimeout, TIMEOUTS } from '@shared/utils/timeout'

// ==========================================
// Constants
// ==========================================
const EXECUTOR_TEMPERATURE = 0.1

// ==========================================
// Main Executor Node
// ==========================================

/**
 * Executor node - creates workflows in n8n via API tools
 *
 * Flow:
 * 1. Create agent with n8n API tools (paused before this via interruptBefore)
 * 2. Create workflow in n8n
 * 3. Extract workflow ID and credential info
 * 4. Complete the graph (terminal node)
 */
export async function executorNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  // DEBUG: Log entry into executor node
  console.log('[EXECUTOR NODE] Entered executor node')

  if (!state.plan)
  {
    throw new Error('No plan to execute')
  }

  console.log('[EXECUTOR NODE] Plan validated, extracting config')
  const executionConfig = extractExecutorConfig(config)

  console.log('[EXECUTOR NODE] Creating executor agent')
  const agent = createExecutorAgent(executionConfig)

  console.log('[EXECUTOR NODE] Invoking executor agent with workflow:', state.plan.workflow.name)
  const result = await invokeExecutor(agent, state, executionConfig, config)

  console.log('[EXECUTOR NODE] Executor completed, extracting results')
  console.log('[EXECUTOR NODE] Result messages:', result.messages.length)

  // Log the last few messages to see what the agent said
  const lastMessages = result.messages.slice(-3)
  lastMessages.forEach((msg: BaseMessage, idx: number) => {
    console.log(`[EXECUTOR NODE] Message ${idx}:`, {
      type: msg._getType(),
      content: typeof msg.content === 'string' ? msg.content.substring(0, 200) : msg.content
    })
  })

  const executionResults = extractExecutionResults(result.messages)

  return new Command({
    goto: END,
    update: {
      workflowId: executionResults.workflowId,
      credentialGuidance: executionResults.credentialGuidance,
      messages: result.messages
    }
  })
}

// ==========================================
// Agent Creation
// ==========================================

/**
 * Create executor agent with n8n API tools
 */
function createExecutorAgent(executionConfig: ReturnType<typeof extractExecutorConfig>)
{
  return createReactAgent({
    llm: new ChatOpenAI({
      apiKey: executionConfig.apiKey,
      model: executionConfig.modelName,
      temperature: EXECUTOR_TEMPERATURE,
      streaming: true
    }),
    tools: executorTools,
    messageModifier: new SystemMessage(buildPrompt('executor'))
  })
}

// ==========================================
// Agent Invocation
// ==========================================

/**
 * Invoke executor agent to create workflow in n8n
 */
async function invokeExecutor(
  agent: ReturnType<typeof createReactAgent>,
  state: OrchestratorStateType,
  executionConfig: ReturnType<typeof extractExecutorConfig>,
  config?: RunnableConfig
)
{
  const plan = state.plan!

  const executionRequest = new HumanMessage(
    buildRequest('executor', {
      workflowName: plan.workflow.name,
      nodeCount: plan.workflow.nodes?.length || 0,
      credentialsNeeded: plan.credentialsNeeded?.map(c => c.type).join(', ') || 'none',
      workflowJson: JSON.stringify(plan.workflow, null, 2),
      n8nApiKey: executionConfig.n8nApiKey,
      n8nBaseUrl: executionConfig.n8nBaseUrl
    })
  )

  try
{
    // Wrap agent invocation with timeout to prevent infinite hangs
    return await withTimeout(
      agent.invoke(
        { messages: [...state.messages, executionRequest] },
        config
      ),
      TIMEOUTS.EXECUTOR,
      `executor creating workflow "${plan.workflow.name}"`
    )
  }
 catch (error)
{
    // Classify and emit error based on failure type
    const err = error instanceof Error ? error : new Error(String(error))
    const errorMessage = err.message.toLowerCase()

    // Determine error context for better user messaging
    const errorContext = {
      workflowName: plan.workflow.name,
      nodeCount: plan.workflow.nodes?.length || 0,
      n8nBaseUrl: executionConfig.n8nBaseUrl,
      errorType: err.name
    }

    // Classify error type for proper infrastructure handling
    if (errorMessage.includes('timeout') || errorMessage.includes('econnaborted'))
{
      emitApiError(
        new Error(`n8n API request timed out. Check if n8n is running at ${executionConfig.n8nBaseUrl}`),
        'executor',
        { ...errorContext, errorCategory: 'timeout' }
      )
    }
 else if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('econnrefused'))
{
      emitApiError(
        new Error(`Failed to connect to n8n at ${executionConfig.n8nBaseUrl}. Ensure n8n is running.`),
        'executor',
        { ...errorContext, errorCategory: 'network' }
      )
    }
 else if (errorMessage.includes('401') || errorMessage.includes('unauthorized'))
{
      emitApiError(
        new Error('n8n API key is invalid or missing. Check your API key in extension options.'),
        'executor',
        { ...errorContext, errorCategory: 'authentication' }
      )
    }
 else if (errorMessage.includes('403') || errorMessage.includes('forbidden'))
{
      emitApiError(
        new Error('n8n API key does not have permission to create workflows.'),
        'executor',
        { ...errorContext, errorCategory: 'authorization' }
      )
    }
 else if (errorMessage.includes('500') || errorMessage.includes('internal server'))
{
      emitApiError(
        new Error('n8n server error. Check n8n logs for details.'),
        'executor',
        { ...errorContext, errorCategory: 'server_error' }
      )
    }
 else
{
      // Unknown error - emit with full context
      emitApiError(err, 'executor', { ...errorContext, errorCategory: 'unknown' })
    }

    // Re-throw to halt workflow creation
    throw err
  }
}

// ==========================================
// Result Extraction
// ==========================================

type ExecutionResults = {
  workflowId?: string
  workflowResult?: { id: string; name: string; url: string }
  credentialGuidance?: OrchestratorStateType['credentialGuidance']
}

/**
 * Extract execution results from agent messages
 */
function extractExecutionResults(messages: BaseMessage[]): ExecutionResults
{
  console.log('[EXECUTOR NODE] Extracting results from', messages.length, 'messages')

  const workflowResult = findLastToolResult<{ id: string; name: string; url: string }>(
    messages,
    'create_n8n_workflow'
  )

  console.log('[EXECUTOR NODE] Workflow tool result:', workflowResult)

  const credentialResult = findLastToolResult<{
    available: string[]
    missing: string[]
    setupLinks?: Array<{ type: string; url: string }>
  }>(messages, 'check_credentials')

  return {
    workflowId: workflowResult?.id,
    workflowResult: workflowResult || undefined,
    credentialGuidance: credentialResult?.setupLinks ? {
      missing: credentialResult.missing.map(type => ({ name: type, type })),
      setupLinks: credentialResult.setupLinks.map(link => ({
        name: link.type,
        url: link.url
      }))
    } : undefined
  }
}

