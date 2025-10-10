import { Command } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, AIMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { buildPrompt } from '../../prompts'
import { debugAgentDecision, debugAgentHandoff } from '../../utils/debug'
import { enrichmentTools } from '../tools/enrichment'

/**
 * Enrichment node handles conversational chat and requirement gathering.
 * 
 * Features:
 * - Tool-based clarification (askClarification tool)
 * - Token streaming support via callbacks
 * - Clean content (no markers in streamed output)
 * - Returns Command for explicit routing control
 * 
 * Flow:
 * 1. LLM responds to user message OR calls askClarification tool
 * 2. If tool called: extract question → set in state → return to END
 * 3. If normal response: return content → END
 * 4. UI detects clarificationQuestion in state and prompts user
 * 
 * Benefits:
 * - No markers appear in streamed content
 * - Tool calls are structured and reliable
 * - Follows proper LangGraph patterns
 */
export async function enrichmentNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  const apiKey = config?.configurable?.openai_api_key
  const modelName = config?.configurable?.model || 'gpt-4o-mini'

  if (!apiKey)
  {
    throw new Error('OpenAI API key not provided in config.configurable')
  }

  debugAgentHandoff('orchestrator', 'enrichment', 'Conversational response and requirement gathering')

  // Bind askClarification tool for requesting user input
  const model = new ChatOpenAI({
    apiKey,
    model: modelName,
    temperature: 0.7,
    streaming: true
    // Don't pass callbacks here - LangGraph propagates them automatically
  }).bindTools(enrichmentTools)

  const systemPrompt = buildPrompt('enrichment', {
    includeNodesReference: true,
    includeConstraints: true
  }) + `

IMPORTANT: You have access to the askClarification tool.

When you need more information from the user:
- Call the askClarification tool with your question
- Ask ONE specific question at a time
- Only use when you truly need critical information

When you have enough information or are just chatting:
- Respond normally without calling any tools
`

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages
  ])

  debugAgentDecision(
    'enrichment',
    'Generated response',
    `Response length: ${(response.content as string).length}`,
    { hasToolCalls: !!(response as AIMessage).tool_calls?.length }
  )

  // Check if LLM called askClarification tool
  const toolCalls = (response as AIMessage).tool_calls

  if (toolCalls && toolCalls.length > 0)
  {
    const askClarCall = toolCalls.find((tc: any) => tc.name === 'askClarification')

    if (askClarCall)
    {
      const question = askClarCall.args?.question as string

      debugAgentDecision(
        'enrichment',
        'Needs clarification',
        'Tool called for user input',
        { question }
      )

      // Set clarification question in state
      // Don't add messages yet - wait for user response
      return new Command({
        goto: 'END',
        update: {
          clarificationQuestion: question
        }
      })
    }
  }

  // Normal response - no clarification needed
  const content = response.content as string

  debugAgentDecision(
    'enrichment',
    'Chat complete',
    content.substring(0, 100),
    { contentLength: content.length }
  )

  // Return response
  return new Command({
    goto: 'END',
    update: {
      messages: [response as AIMessage],
      clarificationQuestion: undefined  // Clear any previous clarification
    }
  })
}

