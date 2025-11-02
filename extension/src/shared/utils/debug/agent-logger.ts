/**
 * Agent Debug Logging
 *
 * Specialized logging for multi-agent orchestration tracking.
 */

import { debug } from './logger'
import { sanitize } from './sanitize'
import type { AgentType } from '@shared/types/messaging'

/**
 * Check if running in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Log an agent decision
 */
export function debugAgentDecision(
  agent: AgentType,
  decision: string,
  reasoning?: string,
  metadata?: unknown
): void
{
  debug({
    component: `Agent:${agent}`,
    action: 'Decision',
    data: {
      decision,
      reasoning,
      metadata: metadata ? sanitize(metadata) : undefined,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log an agent handoff
 */
export function debugAgentHandoff(
  from: AgentType,
  to: AgentType,
  reason: string,
  context?: unknown
): void
{
  if (isDevelopment)
  {
    console.log(
      `%c🔄 [${from.toUpperCase()} → ${to.toUpperCase()}]`,
      'color: #f59e0b; font-weight: bold',
      reason
    )

    if (context)
    {
      console.log('%cContext:', 'color: #8b5cf6', sanitize(context))
    }
  }
}

/**
 * Log agent workflow summary
 */
export function debugAgentWorkflow(agents: AgentType[], totalDuration: number): void
{
  if (!isDevelopment) return

  const flow = agents.map(a => a.toUpperCase()).join(' → ')
  console.group('%c🔀 Agent Workflow', 'color: #3b82f6; font-weight: bold')
  console.log(`%cFlow: ${flow}`, 'color: #6366f1')
  console.log(`%cDuration: ${totalDuration}ms`, 'color: #6b7280')
  console.groupEnd()
}

/**
 * Log agent performance metrics
 */
export function debugAgentMetrics(metrics: {
  agent: AgentType
  llmCalls: number
  totalTokens?: number
  duration: number
}): void
{
  debug({
    component: `Agent:${metrics.agent}`,
    action: 'Metrics',
    data: {
      llmCalls: metrics.llmCalls,
      totalTokens: metrics.totalTokens,
      durationMs: metrics.duration,
      timestamp: new Date().toISOString()
    }
  })
}
