/**
 * LangGraph Event Bridge
 *
 * Converts LangGraph's .streamEvents() async generator into our RxJS event system.
 * This provides automatic event emission for all LLM, tool, and chain operations
 * without manual event emission in orchestrator nodes.
 */

import { from } from 'rxjs'
import { tap, filter } from 'rxjs/operators'
import type { Observable } from 'rxjs'
import { systemEvents } from './index'
import { emitAgentStarted, emitAgentCompleted, emitLLMStarted, emitLLMCompleted } from './emitters'

/**
 * LangGraph StreamEvent type (simplified)
 * Full types come from @langchain/core/tracers/log_stream
 */
type StreamEvent = {
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
export function extractAgentFromMetadata(metadata?: Record<string, any>): string {
  if (!metadata) return 'unknown'

  // Try langgraph_node first (most reliable)
  const node = metadata.langgraph_node
  if (node && typeof node === 'string') {
    // Handle tool nodes by looking at checkpoint_ns
    if (node === 'tools' && metadata.checkpoint_ns) {
      const ns = metadata.checkpoint_ns as string
      if (ns.includes('enrichment')) return 'enrichment'
      if (ns.includes('planner')) return 'planner'
      if (ns.includes('executor')) return 'executor'
      if (ns.includes('classifier')) return 'classifier'
    }

    // Direct node name
    if (node.includes('enrichment')) return 'enrichment'
    if (node.includes('planner')) return 'planner'
    if (node.includes('executor')) return 'executor'
    if (node.includes('classifier')) return 'classifier'
  }

  return 'unknown'
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
    tap(({ event, name, data, metadata }) => {
      switch (event) {
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
          systemEvents.emit({
            domain: 'error',
            type: 'llm',
            payload: {
              error: (data as any)?.error || new Error('LLM error'),
              source: 'langchain',
              context: { name, metadata: sanitizeMetadata(metadata) }
            },
            timestamp: Date.now()
          })
          break

        case 'on_tool_start':
          systemEvents.emit({
            domain: 'agent',
            type: 'tool_started',
            payload: {
              agent: extractAgentFromMetadata(metadata) as any,
              tool: name || 'unknown',
              metadata: { input: data?.input, ...sanitizeMetadata(metadata) }
            },
            timestamp: Date.now()
          })
          break

        case 'on_tool_end':
          systemEvents.emit({
            domain: 'agent',
            type: 'tool_completed',
            payload: {
              agent: extractAgentFromMetadata(metadata) as any,
              tool: name || 'unknown',
              metadata: { output: data?.output, ...sanitizeMetadata(metadata) }
            },
            timestamp: Date.now()
          })
          break

        case 'on_chain_start':
          // Map chain names to agent types (sanitize metadata to remove API keys)
          const sanitizedStartMetadata = sanitizeMetadata(metadata)
          if (name?.toLowerCase().includes('planner')) {
            emitAgentStarted('planner', 'planning', sanitizedStartMetadata)
          } else if (name?.toLowerCase().includes('executor')) {
            emitAgentStarted('executor', 'executing', sanitizedStartMetadata)
          } else if (name?.toLowerCase().includes('enrichment')) {
            emitAgentStarted('enrichment', 'enriching', sanitizedStartMetadata)
          } else if (name?.toLowerCase().includes('classifier')) {
            emitAgentStarted('classifier', 'classifying', sanitizedStartMetadata)
          }
          break

        case 'on_chain_end':
          // Map chain names to agent types (sanitize metadata to remove API keys)
          const sanitizedEndMetadata = sanitizeMetadata(metadata)
          if (name?.toLowerCase().includes('planner')) {
            emitAgentCompleted('planner', sanitizedEndMetadata)
          } else if (name?.toLowerCase().includes('executor')) {
            emitAgentCompleted('executor', sanitizedEndMetadata)
          } else if (name?.toLowerCase().includes('enrichment')) {
            emitAgentCompleted('enrichment', sanitizedEndMetadata)
          } else if (name?.toLowerCase().includes('classifier')) {
            emitAgentCompleted('classifier', sanitizedEndMetadata)
          }
          break
      }
    })
  )
}

