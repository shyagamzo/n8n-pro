import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { buildPrompt } from '../../prompts'
import { stripCodeFences } from '../../utils/markdown'

const validateWorkflowSchema = z.object({
  loomWorkflow: z.string().describe('The workflow in Loom format to validate')
})

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

      // Create ReAct agent for validation (consistent with other agents)
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

      const validationPrompt = new HumanMessage(`Validate this n8n workflow plan for correctness.

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
  Then list each error clearly, and provide a CORRECTED version of the workflow in Loom format.`)

      // ReAct agent validates the workflow
      const result = await agent.invoke({
        messages: [validationPrompt]
      })

      const lastMessage = result.messages[result.messages.length - 1]
      const content = lastMessage.content as string

      // Return validation result in natural language format (easier for LLM to understand)
      if (content.includes('[VALID]')) {
        return `✅ VALIDATION PASSED

The workflow is valid and n8n-compatible. You can proceed with the final output.`
      }

      if (content.includes('[INVALID]')) {
        // Extract corrected Loom from response
        const correctedLoom = extractLoomFromResponse(content)

        if (!correctedLoom) {
          return `❌ VALIDATION FAILED

${content}

Note: Could not automatically extract a corrected workflow. Please review the errors above and fix them manually.`
        }

        return `❌ VALIDATION FAILED

Errors Found:
${content}

---

CORRECTED WORKFLOW (use this):
${correctedLoom}

---

Next Step: Review the corrected workflow above and use it for your final output.`
      }

      // Unexpected response
      return `⚠️ VALIDATION ERROR

Unexpected validation response (no [VALID] or [INVALID] marker found).

Response:
${content}

Please review and try validating again.`
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

