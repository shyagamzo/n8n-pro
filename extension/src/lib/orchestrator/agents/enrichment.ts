import type { ChatMessage } from '../../types/chat'
import { createOpenAiChatModel } from '../../ai/model'
import { createAgentTracer } from '../../ai/tracing'
import { buildPrompt } from '../../prompts'
import { streamChatCompletion } from '../../services/openai'
import { debugAgentDecision, debugAgentHandoff } from '../../utils/debug'

export async function invokeEnrichmentForChat(
  apiKey: string,
  messages: ChatMessage[],
  onToken?: (token: string) => void
): Promise<string>
{
  const tracer = createAgentTracer()
  tracer.setAgent('orchestrator')

  debugAgentHandoff('orchestrator', 'enrichment', 'Conversational response and requirement gathering')

  const systemPrompt = buildPrompt('enrichment', {
    includeNodesReference: true,
    includeConstraints: true,
  })

  const messagesWithSystem: ChatMessage[] = [
    { id: 'system', role: 'system', text: systemPrompt },
    ...messages,
  ]

  debugAgentDecision('orchestrator', 'Using enrichment agent for chat', 'Enrichment provides conversational responses', { promptLength: systemPrompt.length })

  if (onToken)
  {
    await streamChatCompletion(apiKey, messagesWithSystem, onToken)
    tracer.completeTrace()
    return ''
  }

  const model = createOpenAiChatModel({ apiKey, tracer })
  const result = await model.generateText(messagesWithSystem)
  tracer.completeTrace()

  return result
}

export async function checkReadinessToPlan(apiKey: string, messages: ChatMessage[]): Promise<{ ready: boolean; reason?: string }>
{
  const tracer = createAgentTracer()
  tracer.setAgent('orchestrator')

  debugAgentHandoff('orchestrator', 'enrichment', 'Checking if more information is needed')
  tracer.logHandoff('enrichment', 'Assessing readiness to generate workflow plan')
  tracer.setAgent('enrichment')

  const systemPrompt = buildPrompt('enrichment', {
    includeNodesReference: false,
    includeConstraints: true,
  })

  const readinessCheck: ChatMessage = {
    id: 'readiness-check',
    role: 'user',
    text: 'Based on our conversation, do we have enough information to create a complete workflow? ' +
          'Answer with just "READY" if we have all necessary details (trigger type, actions, services, etc.), ' +
          'or "NOT_READY: [what\'s missing]" if we need more information.',
  }

  const messagesWithSystem: ChatMessage[] = [
    { id: 'system', role: 'system', text: systemPrompt },
    ...messages,
    readinessCheck,
  ]

  const model = createOpenAiChatModel({ apiKey, tracer })
  const response = await model.generateText(messagesWithSystem)

  const isReady = response.trim().toUpperCase().startsWith('READY')

  debugAgentDecision(
    'enrichment',
    isReady ? 'Ready to plan' : 'Need more information',
    response,
    { messageCount: messages.length }
  )

  tracer.completeTrace()

  return {
    ready: isReady,
    reason: isReady ? undefined : response.replace(/^NOT_READY:\s*/i, '').trim()
  }
}

