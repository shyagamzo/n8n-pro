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
import { normalizeError } from '@shared/utils/error-normalization'
import { classifyError } from '@shared/utils/error-classifier'

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
  if (!state.plan)
  {
    throw new Error('No plan to execute')
  }

  const executionConfig = extractExecutorConfig(config)
  const agent = createExecutorAgent(executionConfig)
  const result = await invokeExecutor(agent, state, executionConfig, config)
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
    // Normalize and classify error
    const err = normalizeError(error)
    const classification = classifyError(err, executionConfig.n8nBaseUrl)

    // Determine error context for better user messaging
    const errorContext = {
      workflowName: plan.workflow.name,
      nodeCount: plan.workflow.nodes?.length || 0,
      n8nBaseUrl: executionConfig.n8nBaseUrl,
      errorType: err.name,
      errorCategory: classification.category
    }

    // Emit error with classified user message
    emitApiError(
      new Error(classification.userMessage),
      'executor',
      errorContext
    )

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
  const workflowResult = findLastToolResult<{ id: string; name: string; url: string }>(
    messages,
    'create_n8n_workflow'
  )

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

