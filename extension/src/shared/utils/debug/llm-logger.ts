/**
 * LLM Debug Logging
 *
 * Specialized logging for LLM interactions, Loom parsing, and plan generation.
 */

import { debug } from './logger'
import { sanitize } from './sanitize'

/**
 * Log LLM response
 */
export function debugLLMResponse(response: string, prompt?: string): void
{
  debug({
    component: 'Orchestrator',
    action: 'LLM response received',
    data: {
      responseLength: response.length,
      responsePreview: response.slice(0, 200) + (response.length > 200 ? '...' : ''),
      promptLength: prompt?.length,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log Loom parsing result
 */
export function debugLoomParsing(loomText: string, parsed: unknown, success: boolean): void
{
  debug({
    component: 'Orchestrator',
    action: success ? 'Loom parsing succeeded' : 'Loom parsing failed',
    data: {
      loomLength: loomText.length,
      loomPreview: loomText.slice(0, 200) + (loomText.length > 200 ? '...' : ''),
      parsed: success ? sanitize(parsed) : undefined,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log plan generation
 */
export function debugPlanGenerated(plan: unknown): void
{
  debug({
    component: 'Orchestrator',
    action: 'Plan generated',
    data: {
      plan: sanitize(plan),
      timestamp: new Date().toISOString()
    }
  })
}
