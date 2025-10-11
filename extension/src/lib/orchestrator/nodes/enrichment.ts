import { Command } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, AIMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { buildPrompt } from '../../prompts'
import { debugAgentDecision, debugAgentHandoff } from '../../utils/debug'

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
  })

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

  // Always return the response as a normal chat message
  const content = response.content as string

  debugAgentDecision(
    'enrichment',
    'Chat response',
    content.substring(0, 100),
    { contentLength: content.length }
  )

  // Return response - let the LLM handle clarification naturally in chat
  return new Command({
    goto: 'END',
    update: {
      messages: [response as AIMessage]
    }
  })
}

