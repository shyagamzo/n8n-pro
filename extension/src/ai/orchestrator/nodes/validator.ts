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
import { fetchNodeTypesTool } from '@ai/orchestrator/tools/planner'
import { parse as parseLoom, format as formatLoom } from '@loom'
import { stripCodeFences } from '@shared/utils/markdown'
import { loomToPlan } from '@ai/orchestrator/plan-converter'

// ==========================================
// Constants
// ==========================================
const VALIDATOR_TEMPERATURE = 0.1

// ==========================================
// Main Validator Node
// ==========================================

/**
 * Validator node - validates and corrects workflow plans
 *
 * Simple flow:
 * 1. Format plan → Loom
 * 2. Send to LLM → get Loom response
 * 3. Parse Loom → get validated plan
 * 4. Store in state → return to orchestrator
 */
export async function validatorNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  const { plan } = state

  if (!plan)
  {
    throw new Error('No plan to validate')
  }

  const { apiKey, modelName } = extractOpenAIConfig(config)

  // Step 1: Create agent and format input
  const agent = createValidatorAgent(apiKey, modelName)
  const planLoom = formatLoom(plan)

  // Step 2: Invoke agent with Loom-formatted plan
  const result = await invokeValidator(agent, planLoom, config)

  // Step 3: Parse Loom response
  const validationResult = parseValidationResponse(result.messages)

  // Step 4: Return result to orchestrator
  return buildValidationCommand(validationResult, result.messages)
}

// ==========================================
// Agent Creation
// ==========================================

/**
 * Create validator agent with proper configuration
 */
function createValidatorAgent(apiKey: string, modelName: string)
{
  return createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: VALIDATOR_TEMPERATURE,
      streaming: true
    }),
    tools: [fetchNodeTypesTool],
    messageModifier: buildPrompt('validator', {
      includeNodesReference: false,
      includeConstraints: false
    })
  })
}

// ==========================================
// Agent Invocation
// ==========================================

/**
 * Invoke validator agent with Loom-formatted workflow
 */
async function invokeValidator(
  agent: ReturnType<typeof createReactAgent>,
  loomWorkflow: string,
  config?: RunnableConfig
)
{
  const validationRequest = new HumanMessage(
    buildRequest('validator', { workflow: loomWorkflow })
  )

  return await agent.invoke(
    { messages: [validationRequest] },
    config
  )
}

// ==========================================
// Response Parsing
// ==========================================

type ValidationResult =
  | { success: true; plan: NonNullable<OrchestratorStateType['plan']> }
  | { success: false; errors: string[] }

/**
 * Parse validator response from Loom format
 */
function parseValidationResponse(messages: OrchestratorStateType['messages']): ValidationResult
{
  const lastMessage = messages[messages.length - 1]
  const responseContent = lastMessage.content as string

  const cleanedResponse = stripCodeFences(responseContent)
  const parsed = parseLoom(cleanedResponse)

  if (parsed.success && parsed.data)
  {
    const validatedPlan = loomToPlan(parsed.data)

    return { success: true, plan: validatedPlan }
  }

  const errors = parsed.errors?.map(e => e.message) || ['Failed to parse validation response']

  return { success: false, errors }
}

// ==========================================
// Command Building
// ==========================================

/**
 * Build Command with validation results
 */
function buildValidationCommand(
  result: ValidationResult,
  messages: OrchestratorStateType['messages']
): Command
{
  const planUpdate = result.success ? { plan: result.plan } : {}
  const validationStatus = result.success
    ? { valid: true }
    : { valid: false, errors: result.errors }

  return new Command({
    goto: 'orchestrator',
    update: {
      ...planUpdate,
      validationStatus,
      messages
    }
  })
}


