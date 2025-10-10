import { tool } from '@langchain/core/tools'
import { z } from 'zod'

const askClarificationSchema = z.object({
  question: z.string().describe('The specific clarification question to ask the user. Be clear and direct.')
})

/**
 * Tool for enrichment agent to request clarification from the user.
 * 
 * When the enrichment agent needs more information, it calls this tool
 * instead of including markers in its response. This ensures the clarification
 * request is separate from the streamed content.
 * 
 * The tool call triggers an interrupt in the graph, allowing the UI to
 * prompt the user for input without showing internal markers.
 */
export const askClarificationTool = tool(
  async (input) => {
    const args = input as z.infer<typeof askClarificationSchema>
    // Tool execution happens after user provides input
    // Return the question as confirmation
    return `User will be asked: ${args.question}`
  },
  {
    name: 'askClarification',
    description: 'Ask the user for clarification when you need more information to help them. Use this when the user\'s request is ambiguous or you need specific details. Ask ONE question at a time.',
    schema: askClarificationSchema
  }
)

/**
 * All tools available to the enrichment agent.
 */
export const enrichmentTools = [askClarificationTool]

