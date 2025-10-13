// ==========================================
// Imports
// ==========================================

import { Command } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '@ai/orchestrator/state'
import { extractOpenAIConfig } from '@ai/orchestrator/config'
import { buildPrompt, buildRequest } from '@ai/prompts'
import { parse as parseLoom } from '@loom'
import { stripCodeFences } from '@shared/utils/markdown'
import { loomToPlan } from '@ai/orchestrator/plan-converter'
import { plannerTools } from '@ai/orchestrator/tools/planner'

// ==========================================
// Constants
// ==========================================
const PLANNER_TEMPERATURE = 0.2

// ==========================================
// Main Planner Node
// ==========================================

/**
 * Planner node - generates workflow plans in Loom format
 *
 * Flow:
 * 1. Create agent with n8n node type tools
 * 2. Generate workflow plan in Loom format
 * 3. Parse Loom response to plan object
 * 4. Return to orchestrator with plan
 */
export async function plannerNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  const { apiKey, modelName } = extractOpenAIConfig(config)

  const agent = createPlannerAgent(apiKey, modelName)
  const result = await invokePlanner(agent, state.messages, config)
  const plan = parsePlannerResponse(result.messages)

  return new Command({
    goto: 'orchestrator',
    update: {
      plan,
      messages: result.messages
    }
  })
}

// ==========================================
// Agent Creation
// ==========================================

/**
 * Create planner agent with n8n node type tools
 */
function createPlannerAgent(apiKey: string, modelName: string)
{
  const systemPrompt = buildPrompt('planner', {
    includeNodesReference: true,
    includeWorkflowPatterns: true,
    includeConstraints: true
  })

  return createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: PLANNER_TEMPERATURE,
      streaming: true
    }),
    tools: plannerTools,
    messageModifier: systemPrompt
  })
}

// ==========================================
// Agent Invocation
// ==========================================

/**
 * Invoke planner agent to generate workflow plan
 */
async function invokePlanner(
  agent: ReturnType<typeof createReactAgent>,
  messages: OrchestratorStateType['messages'],
  config?: RunnableConfig
)
{
  const planRequest = new HumanMessage(buildRequest('planner'))

  return await agent.invoke(
    { messages: [...messages, planRequest] },
    config
  )
}

// ==========================================
// Response Parsing
// ==========================================

/**
 * Parse planner response from Loom format to Plan object
 */
function parsePlannerResponse(messages: OrchestratorStateType['messages'])
{
  const lastMessage = messages[messages.length - 1]
  const content = lastMessage.content as string

  const cleanedResponse = stripCodeFences(content)
  const parsed = parseLoom(cleanedResponse)

  if (!parsed.success || !parsed.data)
  {
    throw new Error(
      'Failed to generate a valid workflow plan. ' +
      'The AI response could not be parsed. ' +
      'Please try rephrasing your request or providing more details.'
    )
  }

  return loomToPlan(parsed.data)
}

