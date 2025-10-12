import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { buildPrompt } from '@ai/prompts'
import { parse as parseLoom } from '@loom'
import { stripCodeFences } from '@shared/utils/markdown'
import { fetchNodeTypes } from '@n8n/node-types'
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
  // Use provided node types or fetch from n8n (content script context only)
  let availableNodeTypesList: string[]
  
  if (providedNodeTypes && providedNodeTypes.length > 0)
  {
    availableNodeTypesList = providedNodeTypes.sort()
  }
  else
  {
    // Try to fetch (will fail in background worker - needs content script context)
    try
    {
      const nodeTypes = await fetchNodeTypes()
      availableNodeTypesList = Object.keys(nodeTypes).sort()
    }
    catch (error)
    {
      // Fallback to essential node types for validation
      availableNodeTypesList = getEssentialNodeTypes()
    }
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
    // Extract errors with suggestions
    const errors = validationData.validation.errors
      ?.map((e: any) => {
        const parts = [
          `**Node:** ${e.nodeName || e.nodeId || 'Unknown'}`,
          `**Field:** ${e.field || 'Unknown'}`,
          `**Issue:** ${e.issue || 'Unknown error'}`,
          `**Fix:** ${e.suggestion || 'No suggestion provided'}`
        ]
        return parts.join('\n  ')
      })
      .join('\n\n') || 'No specific errors provided'

    return formatInvalidResponse(errors)
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
      const validationResult = await runValidation(
        args.loomWorkflow,
        apiKey,
        modelName,
        args.availableNodeTypes
      )
      return processValidationResult(validationResult)
    },
    {
      name: 'validate_workflow',
      description: 'Validate a workflow plan using LLM knowledge of n8n schemas. Returns validation result with errors and suggestions if invalid. Optionally accepts availableNodeTypes array to skip fetching.',
      schema: validateWorkflowSchema
    }
  )
}

/**
 * Essential node types for fallback validation
 * 
 * Used when REST endpoint is unavailable (e.g., background worker context).
 * Contains most commonly used node types.
 */
function getEssentialNodeTypes(): string[]
{
  return [
    // Triggers
    'n8n-nodes-base.manualTrigger',
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.cronTrigger',
    
    // Core nodes
    'n8n-nodes-base.httpRequest',
    'n8n-nodes-base.code',
    'n8n-nodes-base.set',
    'n8n-nodes-base.if',
    'n8n-nodes-base.merge',
    'n8n-nodes-base.splitInBatches',
    
    // Common services
    'n8n-nodes-base.gmail',
    'n8n-nodes-base.slack',
    'n8n-nodes-base.notion',
    'n8n-nodes-base.airtable',
    'n8n-nodes-base.googleSheets',
    'n8n-nodes-base.discord',
    
    // AI/LangChain nodes
    '@n8n/n8n-nodes-langchain.agent',
    '@n8n/n8n-nodes-langchain.lmChatOpenAi',
    '@n8n/n8n-nodes-langchain.chainLlm'
  ]
}


