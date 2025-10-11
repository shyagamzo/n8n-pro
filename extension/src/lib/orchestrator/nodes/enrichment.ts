import { Command } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { buildPrompt } from '../../prompts'
import { enrichmentCommandTools } from '../tools/enrichment-commands'

/**
 * Enrichment node handles conversational chat and requirement gathering.
 *
 * Uses createReactAgent for consistent agent pattern:
 * - Bound tools: reportRequirementsStatus, setConfidence (metadata-only)
 * - ReAct agent for natural conversation flow
 * - Token streaming support via callbacks
 * - Clean content (no markers in streamed output)
 *
 * Flow:
 * 1. ReAct agent responds naturally to user message
 * 2. If clarification needed: asks question in chat response
 * 3. Calls reportRequirementsStatus tool when ready
 * 4. Orchestrator routes based on tool call arguments
 *
 * Benefits:
 * - Consistent with other agents (planner, executor)
 * - No markers appear in streamed content
 * - Tool calls are structured and reliable
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

  // Agent lifecycle events automatically emitted by LangGraph bridge
  // (on_chain_start → emitAgentStarted('enrichment', 'enriching'))
  
  // Create ReAct agent with enrichment tools
  const systemPrompt = buildPrompt('enrichment', {
    includeNodesReference: true,
    includeConstraints: true
  })

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.7,
      streaming: true
    }),
    tools: enrichmentCommandTools,
    messageModifier: new SystemMessage(systemPrompt)
  })

  // ReAct agent handles tool loop internally
  const result = await agent.invoke(
    { messages: state.messages },
    config
  )

  // Agent events (response, tool calls) automatically captured by LangGraph bridge
  // Let the conditional edge handle routing based on tool calls
  return new Command({
    update: {
      messages: result.messages
    }
  })
}

