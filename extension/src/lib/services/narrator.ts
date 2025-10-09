import { ChatOpenAI } from '@langchain/openai'
import { getAgentPrompt } from '../prompts'
import type { AgentType } from '../prompts'

export type NarratorContext = {
  agent: AgentType
  action: string
  userIntent?: string
  phase: 'started' | 'working' | 'complete' | 'error'
  additionalContext?: Record<string, unknown>
}

/**
 * Generate a friendly, real-time status message for what an agent is doing
 * This runs in parallel with the agent work to provide immediate UX feedback
 */
export async function narrateAgentActivity(
  context: NarratorContext,
  apiKey: string
): Promise<string>
{
  const model = new ChatOpenAI({
    apiKey,
    modelName: 'gpt-4o-mini', // Fast and cheap for narration
    temperature: 0.7,          // Slightly creative
    maxTokens: 30,             // Keep it brief
  })

  const narratorPrompt = getAgentPrompt('narrator')

  // Build context message for narrator
  const contextMessage = `{
  agent: "${context.agent}",
  action: "${context.action}",
  ${context.userIntent ? `userIntent: "${context.userIntent}",` : ''}
  phase: "${context.phase}"
}`

  try
  {
    const response = await model.invoke([
      { role: 'system', content: narratorPrompt },
      { role: 'user', content: contextMessage }
    ])

    const message = response.content.toString().trim()

    // Remove quotes if LLM wrapped the response
    return message.replace(/^["']|["']$/g, '')
  }
  catch (error)
  {
    console.warn('Narrator failed, using fallback:', error)
    
    // Fallback to template-based messages
    return getFallbackMessage(context)
  }
}

/**
 * Fallback template-based messages if LLM narration fails
 */
function getFallbackMessage(context: NarratorContext): string
{
  const { agent, action, phase } = context

  // Template-based fallbacks
  switch (agent)
  {
    case 'enrichment':
      return phase === 'started' ? '🤔 Understanding your request...' : '✅ Requirements clear!'

    case 'planner':
      if (phase === 'started') return '📝 Designing your workflow...'
      if (phase === 'complete') return '✅ Workflow design ready!'
      return '📋 Planning your automation...'

    case 'validator':
      if (phase === 'started') return '✔️ Validating workflow...'
      if (phase === 'error') return '🫣 Fixing workflow issues...'
      if (phase === 'complete') return '✅ Validation passed!'
      return '🔍 Checking workflow...'

    case 'executor':
      if (action.includes('node')) return `➕ ${action}...`
      if (phase === 'started') return '🚀 Creating workflow...'
      if (phase === 'complete') return '✅ Workflow created!'
      return '⚙️ Building your automation...'

    default:
      return phase === 'started' ? '⏳ Working on it...' : '✅ Done!'
  }
}

/**
 * Generate narration in parallel with agent work
 * Returns a promise that resolves faster than the main agent
 */
export async function narrateInParallel<T>(
  context: NarratorContext,
  apiKey: string,
  agentWork: Promise<T>
): Promise<{ narration: string; result: T }>
{
  // Run both in parallel
  const [narration, result] = await Promise.all([
    narrateAgentActivity(context, apiKey),
    agentWork
  ])

  return { narration, result }
}

/**
 * Start narration immediately, return result promise
 * Useful when you need to show the narration ASAP
 */
export async function narrateAndExecute<T>(
  context: NarratorContext,
  apiKey: string,
  agentWork: () => Promise<T>,
  onNarration: (message: string) => void
): Promise<T>
{
  // Start narration immediately
  const narrationPromise = narrateAgentActivity(context, apiKey)
  
  // Start agent work immediately  
  const workPromise = agentWork()

  // Show narration as soon as it's ready (usually 0.5-1s)
  narrationPromise.then(onNarration).catch(err => {
    console.warn('Narration failed:', err)
    onNarration(getFallbackMessage(context))
  })

  // Return the agent work result
  return workPromise
}

