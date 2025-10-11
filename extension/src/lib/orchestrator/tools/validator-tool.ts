import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { buildPrompt } from '../../prompts'
import { stripCodeFences } from '../../utils/markdown'
import {
  VALIDATION_PROMPT_TEMPLATE,
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

  const validationPrompt = new HumanMessage(VALIDATION_PROMPT_TEMPLATE(loomWorkflow))

  // Run validation
  const result = await agent.invoke({
    messages: [validationPrompt]
  })

  const lastMessage = result.messages[result.messages.length - 1]
  return lastMessage.content as string
}

function processValidationResult(content: string): string {
  // Check for valid workflow
  if (content.includes('[VALID]')) {
    return formatValidResponse()
  }

  // Check for invalid workflow
  if (content.includes('[INVALID]')) {
    const correctedLoom = extractLoomFromResponse(content)
    return formatInvalidResponse(content, correctedLoom)
  }

  // Unexpected response
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

/**
 * Extract Loom format from validator response.
 * Looks for corrected workflow after error explanation.
 */
function extractLoomFromResponse(response: string): string | null
{
  // Look for Loom block after "CORRECTED" or similar markers
  const loomMatch = response.match(/(?:corrected|fixed).*?:?\s*\n([\s\S]+?)(?:\n\n|$)/i)
  if (loomMatch)
  {
    return stripCodeFences(loomMatch[1].trim())
  }

  // Try to extract any Loom-like structure (starts with key:value pattern)
  const lines = response.split('\n')
  const loomStart = lines.findIndex(line => /^[a-zA-Z_][a-zA-Z0-9_]*:/.test(line.trim()))
  if (loomStart !== -1)
  {
    return lines.slice(loomStart).join('\n')
  }

  return null
}

