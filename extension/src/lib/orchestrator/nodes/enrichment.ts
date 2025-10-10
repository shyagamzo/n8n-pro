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
 * - State-based interruption for clarification (browser-compatible)
 * - Token streaming support via callbacks
 * - No tools - pure conversational LLM
 * - Returns Command for explicit routing control
 *
 * Flow:
 * 1. LLM responds to user message
 * 2. If needs clarification: set state flag → return to END → UI handles prompt
 * 3. If user provides answer: loop back to enrichment with answer
 * 4. If ready or just chatting: return to END
 *
 * Note: Uses state-based interruption instead of interrupt() function
 * because interrupt() requires Node.js AsyncLocalStorage which doesn't
 * work reliably in browser environments.
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

  const model = new ChatOpenAI({
    apiKey,
    model: modelName,
    temperature: 0.7,
    streaming: true,
    callbacks: config?.callbacks
  })

  const systemPrompt = buildPrompt('enrichment', {
    includeNodesReference: true,
    includeConstraints: true
  }) + `

IMPORTANT RESPONSE MARKERS:
- If you need clarification from the user, end your response with: [NEEDS_INPUT]
- If the user wants a workflow and you have enough information, end with: [READY]
- If just chatting (no workflow intent), end with: [CHAT]

Use [NEEDS_INPUT] sparingly - only when you truly need critical information to proceed.
Ask ONE specific question at a time.
`

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages
  ])

  const content = response.content as string

  debugAgentDecision(
    'enrichment',
    'Generated response',
    `Response length: ${content.length}`,
    { hasMarker: /\[(NEEDS_INPUT|READY|CHAT)\]/.test(content) }
  )

  // Handle clarification using state-based interruption (browser-compatible)
  if (content.includes('[NEEDS_INPUT]'))
  {
    const cleanContent = content.replace('[NEEDS_INPUT]', '').trim()

    debugAgentDecision(
      'enrichment',
      'Needs clarification',
      'Setting clarification question in state',
      { question: cleanContent }
    )

    // Set clarification question in state instead of using interrupt()
    // The orchestrator will detect this and handle the user prompt
    return new Command({
      goto: 'END',
      update: {
        clarificationQuestion: cleanContent,
        messages: [new AIMessage(cleanContent)]
      }
    })
  }

  // Clean up markers
  const cleanContent = content
    .replace('[READY]', '')
    .replace('[CHAT]', '')
    .trim()

  const isReady = content.includes('[READY]')

  debugAgentDecision(
    'enrichment',
    isReady ? 'Ready to plan' : 'Chat complete',
    cleanContent.substring(0, 100),
    { readyToPlan: isReady }
  )

  // Return clean response and end enrichment
  return new Command({
    goto: 'END',
    update: {
      messages: [new AIMessage(cleanContent)]
    }
  })
}

