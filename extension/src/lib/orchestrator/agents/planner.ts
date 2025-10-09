import type { ChatMessage } from '../../types/chat'
import { createOpenAiChatModel } from '../../ai/model'
import { createAgentTracer } from '../../ai/tracing'
import { buildPrompt } from '../../prompts'
import { debugAgentDecision, type DebugSession } from '../../utils/debug'

export async function invokePlannerAgent(
  apiKey: string,
  messages: ChatMessage[],
  session: DebugSession,
  _userIntent?: string,
  onNarrate?: (action: string, phase: 'started' | 'complete') => void
): Promise<string>
{
  const systemPrompt = buildPrompt('planner', {
    includeNodesReference: true,
    includeWorkflowPatterns: true,
    includeConstraints: true,
  })
  session.log('Built planner prompt', { promptLength: systemPrompt.length })

  const planRequest: ChatMessage = {
    id: 'plan-request',
    role: 'user',
    text: 'Generate a workflow plan based on our conversation. Return ONLY raw Loom format - no markdown code blocks, no explanatory text, just the pure Loom structure.',
  }

  const messagesWithSystem: ChatMessage[] = [
    { id: 'system', role: 'system', text: systemPrompt },
    ...messages,
    planRequest,
  ]

  const tracer = createAgentTracer(session.getSessionId())
  const model = createOpenAiChatModel({ apiKey, tracer })

  session.log('Calling LLM for plan generation')
  debugAgentDecision('planner', 'Generating workflow plan', 'Using LLM to convert conversation to Loom format', { messageCount: messagesWithSystem.length })

  onNarrate?.('designing workflow', 'started')

  return await model.generateText(messagesWithSystem)
}

