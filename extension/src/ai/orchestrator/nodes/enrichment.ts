// ==========================================
// Imports
// ==========================================

import { Command } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '@ai/orchestrator/state'
import { extractOpenAIConfig } from '@ai/orchestrator/config'
import { buildPrompt } from '@ai/prompts'
import { enrichmentCommandTools } from '@ai/orchestrator/tools/enrichment-commands'
import { findLastToolCall } from '@shared/utils/langchain-messages'

// ==========================================
// Constants
// ==========================================
const ENRICHMENT_TEMPERATURE = 0.7

// ==========================================
// Main Enrichment Node
// ==========================================

/**
 * Enrichment node - conversational requirement gathering
 *
 * Flow:
 * 1. Create agent with requirement gathering tools
 * 2. Process user messages
 * 3. Extract requirements status from tool calls
 * 4. Return to orchestrator with results
 */
export async function enrichmentNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  const { apiKey, modelName } = extractOpenAIConfig(config)

  const agent = createEnrichmentAgent(apiKey, modelName)
  const result = await agent.invoke({ messages: state.messages }, config)

  const requirementsStatus = findLastToolCall<{
    hasAllRequiredInfo: boolean
    confidence: number
    missingInfo?: string[]
  }>(result.messages, 'reportRequirementsStatus')

  return new Command({
    goto: 'orchestrator',
    update: {
      messages: result.messages,
      requirementsStatus
    }
  })
}

// ==========================================
// Agent Creation
// ==========================================

/**
 * Create enrichment agent with requirement gathering tools
 */
function createEnrichmentAgent(apiKey: string, modelName: string)
{
  const systemPrompt = buildPrompt('enrichment', {
    includeNodesReference: true,
    includeConstraints: true
  })

  return createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: ENRICHMENT_TEMPERATURE,
      streaming: true
    }),
    tools: enrichmentCommandTools,
    messageModifier: new SystemMessage(systemPrompt)
  })
}


