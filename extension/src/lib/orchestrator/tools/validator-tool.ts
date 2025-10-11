import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { buildPrompt } from '../../prompts'
import { stripCodeFences } from '../../utils/markdown'

const validateWorkflowSchema = z.object({
  loomWorkflow: z.string().describe('The workflow in Loom format to validate'),
  apiKey: z.string().describe('OpenAI API key for validation'),
  modelName: z.string().default('gpt-4o-mini').describe('Model to use for validation')
})

/**
 * Tool for planner to validate workflow plans using LLM knowledge.
 * 
 * This tool encapsulates the validator agent as a tool that the planner can call.
 * It performs LLM-based validation of workflow plans using n8n knowledge.
 * 
 * Returns validation result with either [VALID] or [INVALID] + corrections.
 */
export const validateWorkflowTool = tool(
  async (input) => {
    const args = input as z.infer<typeof validateWorkflowSchema>
    
    const model = new ChatOpenAI({
      apiKey: args.apiKey,
      model: args.modelName,
      temperature: 0.1  // Low temperature for consistent validation
    })

    const systemPrompt = buildPrompt('validator', {
      includeNodesReference: true,
      includeConstraints: true
    })

    const validationPrompt = `Validate this n8n workflow plan for correctness.

Workflow Plan (Loom format):
${args.loomWorkflow}

Check for:
1. Node types are valid n8n node types (correct package.nodeName format, e.g. "n8n-nodes-base.slack")
2. Required parameters are present for each node type
3. Connections reference existing node names
4. Trigger nodes are appropriate (scheduleTrigger, webhook, manualTrigger, etc.)
5. Credentials are correctly specified where needed

Response format:
- If the workflow is VALID, respond with: [VALID]
- If there are ERRORS, respond with: [INVALID]
  Then list each error clearly, and provide a CORRECTED version of the workflow in Loom format.`

    const validationResponse = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(validationPrompt)
    ])

    const content = validationResponse.content as string

    // Return validation result
    if (content.includes('[VALID]')) {
      return JSON.stringify({
        valid: true,
        message: 'Workflow validation passed. The workflow is n8n-compatible.'
      })
    }

    if (content.includes('[INVALID]')) {
      // Extract corrected Loom from response
      const correctedLoom = extractLoomFromResponse(content)

      return JSON.stringify({
        valid: false,
        errors: content,
        correctedWorkflow: correctedLoom,
        message: 'Workflow validation failed. See errors and corrected workflow.'
      })
    }

    // Unexpected response
    return JSON.stringify({
      valid: false,
      errors: 'Unexpected validation response',
      message: content
    })
  },
  {
    name: 'validate_workflow',
    description: 'Validate a workflow plan in Loom format using LLM knowledge of n8n schemas. Returns validation result with errors and corrections if invalid. Use this to check if your workflow design is correct before finalizing.',
    schema: validateWorkflowSchema
  }
)

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

