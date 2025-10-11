import { Command } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, AIMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { buildPrompt } from '../../prompts'
import { debugAgentDecision, debugAgentHandoff } from '../../utils/debug'
import { enrichmentCommandTools } from '../tools/enrichment-commands'

/**
 * Enrichment node handles conversational chat and requirement gathering.
 *
 * Features:
 * - Natural conversation flow with clarification questions
 * - Token streaming support via callbacks
 * - Clean content (no markers in streamed output)
 * - Returns Command for explicit routing control
 *
 * Flow:
 * 1. LLM responds naturally to user message
 * 2. If clarification needed: asks question in chat response
 * 3. User responds naturally in chat conversation
 * 4. Conversation continues until requirements are clear
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
  }).bindTools(enrichmentCommandTools)

  const systemPrompt = buildPrompt('enrichment', {
    includeNodesReference: true,
    includeConstraints: true
  })

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

  // Check if LLM called any command tools
  const toolCalls = (response as AIMessage).tool_calls
  
  if (toolCalls && toolCalls.length > 0) {
    debugAgentDecision(
      'enrichment',
      'Command tools called',
      `Found ${toolCalls.length} tool calls`,
      { toolCalls: toolCalls.map(tc => tc.name) }
    )
    
    // Route to tool processing node
    return new Command({
      goto: 'enrichment_tools',
      update: {
        messages: [response as AIMessage]
      }
    })
  }

  // No tool calls - normal chat response
  const content = response.content as string
  debugAgentDecision(
    'enrichment',
    'Chat response',
    content.substring(0, 100),
    { contentLength: content.length }
  )

  // Let the orchestrator decide routing based on state
  // Enrichment agent just reports its status via tools

  return new Command({
    goto: 'END',
    update: {
      messages: [response as AIMessage]
    }
  })
}

