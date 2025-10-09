import type { AgentType } from '../prompts'
import type { BackgroundMessage } from '../types/messaging'
import { narrate } from '../services/narrator'

export type NarrationManager = {
  post: (agent: AgentType, action: string, phase: 'started' | 'working' | 'complete' | 'error', userIntent?: string) => void
}

/**
 * Create a narration manager that posts agent activities
 */
export function createNarrationManager(
  postHandler: (message: BackgroundMessage) => void,
  apiKey: string
): NarrationManager
{
  return {
    post(agent, action, phase, userIntent?)
    {
      // Fire-and-forget: narration posts when ready
      narrate({ agent, action, userIntent, phase }, apiKey)
        .then(activity =>
        {
          postHandler({
            type: 'agent_activity',
            agent,
            activity,
            status: phase,
            id: `${agent}-${phase}-${Date.now()}`,
            timestamp: Date.now()
          })
        })
        .catch(() =>
        {
          // Fallback if narrator fails
          const fallback = `${phase === 'started' ? '⏳' : phase === 'complete' ? '✅' : '⚙️'} ${agent}...`
          postHandler({
            type: 'agent_activity',
            agent,
            activity: fallback,
            status: phase,
            id: `${agent}-${phase}-${Date.now()}`,
            timestamp: Date.now()
          })
        })
    }
  }
}

