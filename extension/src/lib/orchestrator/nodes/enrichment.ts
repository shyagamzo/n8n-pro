import { Command, interrupt } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { buildPrompt } from '../../prompts'
import { debugAgentDecision, debugAgentHandoff } from '../../utils/debug'

/**
 * Enrichment node handles conversational chat and requirement gathering.
 * 
 * Features:
 * - Uses interrupt() for clarification when needed (one question at a time)
 * - Token streaming support via callbacks
 * - No tools - pure conversational LLM
 * - Returns Command for explicit routing control
 * 
 * Flow:
 * 1. LLM responds to user message
 * 2. If needs clarification: interrupt() → loop back to enrichment
 * 3. If ready or just chatting: return to END
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

  // Handle clarification interrupt
  if (content.includes('[NEEDS_INPUT]'))
  {
    const cleanContent = content.replace('[NEEDS_INPUT]', '').trim()

    debugAgentDecision(
      'enrichment',
      'Needs clarification',
      'Interrupting for user input',
      { question: cleanContent }
    )

    // Typed interrupt: send question, receive string response
    const userInput = interrupt<
      { question: string; reason: 'clarification' },
      string
    >({
      question: cleanContent,
      reason: 'clarification'
    })

    debugAgentDecision(
      'enrichment',
      'User provided input',
      'Continuing enrichment',
      { inputLength: userInput.length }
    )

    // Loop back to enrichment with user's answer
    return new Command({
      goto: 'enrichment',
      update: {
        messages: [
          new AIMessage(cleanContent),
          new HumanMessage(userInput)
        ]
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

