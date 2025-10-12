/**
 * LangGraph Event Bridge
 *
 * Converts LangGraph's .streamEvents() async generator into our RxJS event system.
 * Provides utilities for event emission and metadata sanitization.
 */

import { from } from 'rxjs'
import { tap, filter } from 'rxjs/operators'
import type { Observable } from 'rxjs'
import { emitAgentStarted, emitAgentCompleted, emitLLMStarted, emitLLMCompleted, emitToolStarted, emitToolCompleted, emitSystemError } from './emitters'
import type { AgentType } from './types'

/**
 * LangGraph StreamEvent type (simplified)
 * Full types come from @langchain/core/tracers/log_stream
 */
export type StreamEvent = {
  event: string
  name?: string
  data?: any
  metadata?: Record<string, any>
}

/**
 * Sanitize metadata by removing sensitive information
 * CRITICAL: Prevents API keys from appearing in logs
 */
export function sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
  if (!metadata) return undefined

  const sanitized = { ...metadata }

  // Remove API keys and sensitive data
  delete sanitized.openai_api_key
  delete sanitized.n8n_api_key
  delete sanitized.api_key

  return sanitized
}

/**
 * Extract agent name from LangGraph metadata
 * Uses langgraph_node or checkpoint_ns to determine which agent is executing
 */
export function extractAgentFromMetadata(metadata?: Record<string, any>): AgentType {
  if (!metadata) return 'orchestrator'

  // Try langgraph_node first (most reliable)
  const node = metadata.langgraph_node
  
  if (node && typeof node === 'string') {
    // Handle tool nodes by looking at checkpoint_ns
    if (node === 'tools' && metadata.checkpoint_ns) {
      const ns = metadata.checkpoint_ns as string
      if (ns.includes('enrichment')) return 'enrichment'
      if (ns.includes('planner')) return 'planner'
      if (ns.includes('executor')) return 'executor'
    }

    // Direct node name
    if (node.includes('enrichment')) return 'enrichment'
    if (node.includes('planner')) return 'planner'
    if (node.includes('executor')) return 'executor'
  }

  // Default to orchestrator for unknown agents
  return 'orchestrator'
}

/**
 * Emit a single LangGraph event to the reactive system.
 * Shared logic used by both bridge Observable and manual iteration.
 *
 * @param event - StreamEvent from LangGraph
 */
export function emitLangGraphEvent(event: StreamEvent): void {
  const { event: eventType, name, data, metadata } = event

  switch (eventType) {
    case 'on_llm_start':
      emitLLMStarted(
        metadata?.ls_model_name,
        metadata?.ls_provider,
        metadata?.run_id
      )
      break

    case 'on_llm_end':
      emitLLMCompleted(
        data?.output?.usage_metadata,
        metadata?.run_id
      )
      break

    case 'on_llm_error':
      emitSystemError(
        (data as any)?.error || new Error('LLM error'),
        'langchain',
        { name, ...sanitizeMetadata(metadata) }
      )
      break

    case 'on_tool_start':
      {
        const agent = extractAgentFromMetadata(metadata)
        // Debug: log metadata to diagnose missing planner tool events
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] tool_start:', {
            tool: name,
            agent,
            langgraph_node: metadata?.langgraph_node,
            checkpoint_ns: metadata?.checkpoint_ns
          })
        }
        emitToolStarted(
          agent,
          name || 'unknown',
          { input: data?.input, ...sanitizeMetadata(metadata) }
        )
      }
      break

    case 'on_tool_end':
      emitToolCompleted(
        extractAgentFromMetadata(metadata),
        name || 'unknown',
        { output: data?.output, ...sanitizeMetadata(metadata) }
      )
      break

    case 'on_chain_start':
      {
        const sanitized = sanitizeMetadata(metadata)
        if (name?.toLowerCase().includes('planner')) {
          emitAgentStarted('planner', 'planning', sanitized)
        } else if (name?.toLowerCase().includes('executor')) {
          emitAgentStarted('executor', 'executing', sanitized)
        } else if (name?.toLowerCase().includes('enrichment')) {
          emitAgentStarted('enrichment', 'enriching', sanitized)
        }
      }
      break

    case 'on_chain_end':
      {
        const sanitized = sanitizeMetadata(metadata)
        if (name?.toLowerCase().includes('planner')) {
          emitAgentCompleted('planner', sanitized)
        } else if (name?.toLowerCase().includes('executor')) {
          emitAgentCompleted('executor', sanitized)
        } else if (name?.toLowerCase().includes('enrichment')) {
          emitAgentCompleted('enrichment', sanitized)
        }
      }
      break
  }
}

/**
 * Bridge LangGraph's event stream to our RxJS system
 *
 * @param eventStream - AsyncGenerator from workflowGraph.streamEvents()
 * @returns Observable that emits SystemEvents
 */
export function bridgeLangGraphEvents(eventStream: AsyncGenerator<StreamEvent>): Observable<StreamEvent> {
  return from(eventStream).pipe(
    filter(({ event }) =>
      event === 'on_llm_start' ||
      event === 'on_llm_end' ||
      event === 'on_llm_error' ||
      event === 'on_tool_start' ||
      event === 'on_tool_end' ||
      event === 'on_chain_start' ||
      event === 'on_chain_end'
    ),
    tap(emitLangGraphEvent)
  )
}
