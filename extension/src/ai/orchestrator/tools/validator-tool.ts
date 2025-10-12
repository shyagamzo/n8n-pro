import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { buildPrompt } from '@ai/prompts'
import { parse as parseLoom, format as formatLoom } from '@loom'
import { stripCodeFences } from '@shared/utils/markdown'
import {
  buildValidationPrompt,
  formatValidResponse,
  formatInvalidResponse,
  formatUnexpectedResponse
} from './validator-responses'

// ============================================================================
// Schema
// ============================================================================

const validateWorkflowSchema = z.object({
  loomWorkflow: z.string().describe('The workflow in Loom format to validate')
})

// ============================================================================
// Validator Agent
// ============================================================================

async function runValidation(
  loomWorkflow: string,
  apiKey: string,
  modelName: string
): Promise<string> {
  // Create ReAct agent for validation
  const systemPrompt = buildPrompt('validator', {
    includeNodesReference: true,
    includeConstraints: true
  })

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.1  // Low temperature for consistent validation
    }),
    tools: [],  // No tools needed for validation
    messageModifier: new SystemMessage(systemPrompt)
  })

  const validationPrompt = new HumanMessage(buildValidationPrompt(loomWorkflow))

  // Run validation
  const result = await agent.invoke({
    messages: [validationPrompt]
  })

  const lastMessage = result.messages[result.messages.length - 1]
  return lastMessage.content as string
}

function processValidationResult(content: string): string {
  // Parse the validation result as Loom format
  const cleaned = stripCodeFences(content)
  const parsed = parseLoom(cleaned)

  if (!parsed.success || !parsed.data) {
    // If we can't parse as Loom, return as unexpected response
    return formatUnexpectedResponse(content)
  }

  const validationData = parsed.data as any

  // Check validation status
  if (validationData.validation?.status === 'valid') {
    return formatValidResponse()
  }

  if (validationData.validation?.status === 'invalid') {
    // Extract errors
    const errors = validationData.validation.errors
      ?.map((e: any) => `- ${e.error}`)
      .join('\n') || 'No specific errors provided'

    // Extract corrected workflow (it's a Loom object, need to convert back to string)
    const correctedWorkflowObj = validationData.validation.correctedWorkflow
    const correctedLoom = correctedWorkflowObj ? formatLoom(correctedWorkflowObj) : null

    return formatInvalidResponse(errors, correctedLoom)
  }

  // Unexpected status or missing validation field
  return formatUnexpectedResponse(content)
}

// ============================================================================
// Tool Factory
// ============================================================================

/**
 * Factory function to create a validator tool with API key from closure.
 *
 * This ensures the API key is not passed as a tool parameter (security).
 * The validator uses createReactAgent for consistency with other agents.
 */
export function createValidatorTool(apiKey: string, modelName: string = 'gpt-4o-mini') {
  return tool(
    async (input) => {
      const args = input as z.infer<typeof validateWorkflowSchema>
      const validationResult = await runValidation(args.loomWorkflow, apiKey, modelName)
      return processValidationResult(validationResult)
    },
    {
      name: 'validate_workflow',
      description: 'Validate a workflow plan in Loom format using LLM knowledge of n8n schemas. Returns validation result with errors and corrections if invalid. Use this to check if your workflow design is correct before finalizing.',
      schema: validateWorkflowSchema
    }
  )
}


