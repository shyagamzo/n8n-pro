import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { buildPrompt } from '@ai/prompts'
import { fetchNodeTypes } from '@n8n/node-types'
import { buildValidationPrompt } from './validator-responses'

// ============================================================================
// Schema
// ============================================================================

const validateWorkflowSchema = z.object({
  loomWorkflow: z.string().describe('The workflow in Loom format to validate'),
  availableNodeTypes: z.array(z.string()).optional().describe('List of available node types (optional, will fetch if not provided)')
})

// ============================================================================
// Validator Agent
// ============================================================================

async function runValidation(
  loomWorkflow: string,
  apiKey: string,
  modelName: string,
  providedNodeTypes?: string[]
): Promise<string> {
  // Use provided node types or fetch from n8n
  let availableNodeTypesList: string[]

  if (providedNodeTypes && providedNodeTypes.length > 0)
  {
    availableNodeTypesList = providedNodeTypes.sort()
  }
  else
  {
    // Fetch from n8n (requires content script context with cookies)
    const nodeTypes = await fetchNodeTypes()
    availableNodeTypesList = Object.keys(nodeTypes).sort()
  }

  // Create ReAct agent for validation
  // Don't include nodes reference or constraints - keep it simple and focused
  const systemPrompt = buildPrompt('validator', {
    includeNodesReference: false,
    includeConstraints: false
  })

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.1,  // Low temperature for consistent validation
      streaming: false   // Validator works silently - no token streaming
    }),
    tools: [],  // No tools needed for validation
    messageModifier: new SystemMessage(systemPrompt)
  })

  // Build validation prompt with node types list
  const validationPrompt = new HumanMessage(
    buildValidationPrompt(loomWorkflow, availableNodeTypesList)
  )

  // Run validation
  const result = await agent.invoke({
    messages: [validationPrompt]
  })

  const lastMessage = result.messages[result.messages.length - 1]
  return lastMessage.content as string
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
      // Validator agent returns validation result directly - no post-processing needed
      return runValidation(
        args.loomWorkflow,
        apiKey,
        modelName,
        args.availableNodeTypes
      )
    },
    {
      name: 'validate_workflow',
      description: 'Validate a workflow plan using LLM knowledge of n8n schemas. Returns validation result in same format as input with status and errors if invalid.',
      schema: validateWorkflowSchema
    }
  )
}
