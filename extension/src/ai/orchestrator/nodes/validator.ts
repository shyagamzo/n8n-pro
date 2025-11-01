// ==========================================
// Imports
// ==========================================

import { Command } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
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
    messageModifier: new SystemMessage(buildPrompt('validator', {
      includeNodesReference: false,
      includeConstraints: false
    }))
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
 *
 * Validator can either:
 * 1. Return valid Loom with validation status (preferred)
 * 2. Return corrected Loom workflow
 * 3. Fail to parse (treat as valid and pass through original plan)
 *
 * Philosophy: Be permissive. If we can't parse the validator's response,
 * assume the workflow is valid rather than creating an infinite loop.
 */
function parseValidationResponse(messages: OrchestratorStateType['messages']): ValidationResult
{
  const lastMessage = messages[messages.length - 1]
  const responseContent = lastMessage.content as string

  const cleanedResponse = stripCodeFences(responseContent)
  const parsed = parseLoom(cleanedResponse)

  if (parsed.success && parsed.data)
  {
    // Check if validator added validation status
    const validationStatus = (parsed.data as any).validation?.status

    if (validationStatus === 'invalid')
    {
      // Validator found errors - extract them
      const errors = (parsed.data as any).validation?.errors || []
      const errorMessages = errors.map((e: any) =>
        `${e.nodeId || 'Unknown'}: ${e.issue || 'Unknown error'}`
      )

      return { success: false, errors: errorMessages.length > 0 ? errorMessages : ['Validation failed'] }
    }

    // Either valid or no validation status - convert to plan
    const validatedPlan = loomToPlan(parsed.data)

    return { success: true, plan: validatedPlan }
  }

  // Failed to parse - this could mean validator just said "VALID" or similar
  // Rather than creating infinite loop, assume valid and pass through original
  // The executor will catch any actual API errors
  return { success: true, plan: null as any } // null signals to use existing plan
}

// ==========================================
// Command Building
// ==========================================

/**
 * Build Command with validation results
 *
 * IMPORTANT: When validation fails, we add feedback to messages
 * so the planner can see what went wrong and fix it on retry.
 */
function buildValidationCommand(
  result: ValidationResult,
  messages: OrchestratorStateType['messages']
): Command
{
  // If we have a new plan, use it. Otherwise keep existing plan
  const planUpdate = result.success && result.plan ? { plan: result.plan } : {}
  const validationStatus = result.success
    ? { valid: true }
    : { valid: false, errors: result.errors }

  // If validation failed, inject feedback into message history
  // so planner knows what to fix on next iteration
  let updatedMessages = messages

  if (!result.success && result.errors.length > 0)
  {
    const feedbackMessage = new HumanMessage(
      'VALIDATION ERRORS:\n\n' +
      result.errors.map((e, i) => `${i + 1}. ${e}`).join('\n') +
      '\n\nPlease fix these errors and regenerate the workflow plan.'
    )
    updatedMessages = [...messages, feedbackMessage]
  }

  return new Command({
    goto: 'orchestrator',
    update: {
      ...planUpdate,
      validationStatus,
      messages: updatedMessages
    }
  })
}


