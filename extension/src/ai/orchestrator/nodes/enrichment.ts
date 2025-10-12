import { Command } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '@ai/orchestrator/state'
import { buildPrompt } from '@ai/prompts'
import { enrichmentCommandTools } from '@ai/orchestrator/tools/enrichment-commands'

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

  // Extract requirements status from tool calls and update state
  const requirementsStatus = extractRequirementsStatus(result.messages)

  // Update state with messages and requirements status
  return new Command({
    update: {
      messages: result.messages,
      requirementsStatus
    }
  })
}

/**
 * Extract requirements status from agent messages
 *
 * Searches through the agent's messages for a reportRequirementsStatus tool call
 * and extracts the arguments to update state.
 */
function extractRequirementsStatus(
  messages: any[]
): { hasAllRequiredInfo: boolean; confidence: number; missingInfo?: string[] } | undefined
{
  // Search backwards for the most recent AI message with tool calls
  for (let i = messages.length - 1; i >= 0; i--)
  {
    const msg = messages[i] as any

    if (msg.tool_calls && msg.tool_calls.length > 0)
    {
      // Find reportRequirementsStatus tool call
      for (const toolCall of msg.tool_calls)
      {
        if (toolCall.name === 'reportRequirementsStatus')
        {
          return {
            hasAllRequiredInfo: toolCall.args.hasAllRequiredInfo,
            confidence: toolCall.args.confidence,
            missingInfo: toolCall.args.missingInfo
          }
        }
      }
    }
  }

  return undefined
}

