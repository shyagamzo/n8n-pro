/**
 * Event Formatting Utilities
 *
 * Shared utilities for formatting events across validation and logging.
 * Eliminates duplication between event-contracts.ts and logger.ts.
 */

import type { SystemEvent } from '@events/types'

/**
 * Format event as human-readable signature string
 *
 * @param event - Event to format
 * @returns Formatted string (e.g., "agent:started (enrichment)")
 *
 * @example
 * ```typescript
 * const event = { domain: 'agent', type: 'started', payload: { agent: 'enrichment' } }
 * formatEventSignature(event) // "agent:started (enrichment)"
 * ```
 */
export function formatEventSignature(event: SystemEvent): string
{
  let formatted = `${event.domain}:${event.type}`

  if ('agent' in event.payload && event.payload.agent)
  {
    formatted += ` (${event.payload.agent})`
  }

  if ('toStep' in event.payload && event.payload.toStep)
  {
    formatted += ` (→ ${event.payload.toStep})`
  }

  return formatted
}

/**
 * Extract details from event payload for display
 *
 * @param event - Event to extract details from
 * @returns Array of detail strings
 *
 * @example
 * ```typescript
 * const event = {
 *   domain: 'workflow',
 *   type: 'created',
 *   payload: { workflow: { name: 'My Workflow' }, workflowId: '123' }
 * }
 * extractEventDetails(event) // ['"My Workflow"', 'id: 123']
 * ```
 */
export function extractEventDetails(event: SystemEvent): string[]
{
  const details: string[] = []
  const payload = event.payload

  // Workflow events
  if ('workflow' in payload && payload.workflow && typeof payload.workflow === 'object')
  {
    const workflow = payload.workflow as { name?: string }
    if (workflow.name) details.push(`"${workflow.name}"`)
  }

  if ('workflowId' in payload && payload.workflowId)
  {
    details.push(`id: ${payload.workflowId}`)
  }

  // Agent events
  if ('agent' in payload && payload.agent)
  {
    details.push(String(payload.agent))
  }

  if ('action' in payload && payload.action)
  {
    details.push(String(payload.action))
  }

  if ('tool' in payload && payload.tool)
  {
    details.push(`tool: ${payload.tool}`)
  }

  // Graph events
  if ('fromStep' in payload && payload.fromStep)
  {
    details.push(`from: ${payload.fromStep}`)
  }

  if ('toStep' in payload && payload.toStep)
  {
    details.push(`to: ${payload.toStep}`)
  }

  if ('reason' in payload && payload.reason)
  {
    details.push(String(payload.reason))
  }

  // LLM events
  if ('model' in payload && payload.model)
  {
    details.push(String(payload.model))
  }

  if ('provider' in payload && payload.provider)
  {
    details.push(`(${payload.provider})`)
  }

  // Token count (if available)
  if ('tokens' in payload && payload.tokens && typeof payload.tokens === 'object')
  {
    const tokens = payload.tokens as { prompt?: number; completion?: number }
    const totalTokens = (tokens.prompt ?? 0) + (tokens.completion ?? 0)
    if (totalTokens > 0) details.push(`${totalTokens} tokens`)
  }

  // Error events
  if ('source' in payload && payload.source)
  {
    details.push(String(payload.source))
  }

  if ('error' in payload && payload.error && typeof payload.error === 'object')
  {
    const error = payload.error as { message?: string }
    if (error.message) details.push(error.message.slice(0, 50))
  }

  // Storage events
  if ('key' in payload && payload.key)
  {
    details.push(`key: ${payload.key}`)
  }

  // System events
  if ('component' in payload && payload.component)
  {
    details.push(String(payload.component))
  }

  if ('message' in payload && payload.message && typeof payload.message === 'string')
  {
    details.push(payload.message)
  }

  return details
}
