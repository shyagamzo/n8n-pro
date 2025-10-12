import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { buildPrompt, buildRequest } from '@ai/prompts'
import { fetchNodeTypesTool } from './planner'
import { emitAgentStarted, emitAgentCompleted } from '@events/emitters'

const validateWorkflowSchema = z.object({
  loomWorkflow: z.string().describe('The workflow to validate'),
  apiKey: z.string().describe('OpenAI API key for validator agent')
})

/**
 * Tool for planner to validate workflow.
 *
 * Creates a validator agent that:
 * - Has access to fetchNodeTypesTool to get available node types
 * - Validates the workflow schema
 * - Returns validation result with errors and suggestions
 */
export const validateWorkflowTool = tool(
  async (input) => {
    const args = input as z.infer<typeof validateWorkflowSchema>

    // Create validator agent with access to node types tool
    const systemPrompt = buildPrompt('validator', {
      includeNodesReference: false,
      includeConstraints: false
    })

    const agent = createReactAgent({
      llm: new ChatOpenAI({
        apiKey: args.apiKey,
        model: 'gpt-4o-mini',
        temperature: 0.1,
        streaming: true  // Enable streaming for tool calls to work
      }),
      tools: [fetchNodeTypesTool],  // Validator can fetch node types as needed
      messageModifier: systemPrompt
    })

    // Build request from template
    const validationRequest = new HumanMessage(
      buildRequest('validator', { workflow: args.loomWorkflow })
    )

    // Manually emit validator agent lifecycle events
    // (nested agents don't auto-emit through LangGraph streamEvents)
    emitAgentStarted('validator', 'validating', {})

    const result = await agent.invoke({
      messages: [validationRequest]
    })

    emitAgentCompleted('validator', {})

    const lastMessage = result.messages[result.messages.length - 1]
    return lastMessage.content as string
  },
  {
    name: 'validate_workflow',
    description: 'Validate a workflow plan. The validator agent will fetch available node types and check if the workflow uses valid types. Returns validation result with status and errors if invalid.',
    schema: validateWorkflowSchema
  }
)
