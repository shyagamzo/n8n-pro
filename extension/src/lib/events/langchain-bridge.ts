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
 * Bridge LangGraph's event stream to our RxJS system
 * 
 * @param eventStream - AsyncGenerator from workflowGraph.streamEvents()
 * @returns Observable that emits SystemEvents
 */
export function bridgeLangGraphEvents(eventStream: AsyncGenerator<StreamEvent>): Observable<void> {
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
              error: data?.error || new Error('LLM error'),
              source: 'langchain',
              context: { name, metadata }
            },
            timestamp: Date.now()
          })
          break
          
        case 'on_tool_start':
          systemEvents.emit({
            domain: 'agent',
            type: 'tool_started',
            payload: {
              agent: 'executor', // Tools are typically called by executor
              tool: name || 'unknown',
              metadata: { input: data?.input, ...metadata }
            },
            timestamp: Date.now()
          })
          break
          
        case 'on_tool_end':
          systemEvents.emit({
            domain: 'agent',
            type: 'tool_completed',
            payload: {
              agent: 'executor',
              tool: name || 'unknown',
              metadata: { output: data?.output, ...metadata }
            },
            timestamp: Date.now()
          })
          break
          
        case 'on_chain_start':
          // Map chain names to agent types
          if (name?.toLowerCase().includes('planner')) {
            emitAgentStarted('planner', 'planning', metadata)
          } else if (name?.toLowerCase().includes('executor')) {
            emitAgentStarted('executor', 'executing', metadata)
          } else if (name?.toLowerCase().includes('enrichment')) {
            emitAgentStarted('enrichment', 'enriching', metadata)
          } else if (name?.toLowerCase().includes('classifier')) {
            emitAgentStarted('classifier', 'classifying', metadata)
          }
          break
          
        case 'on_chain_end':
          // Map chain names to agent types
          if (name?.toLowerCase().includes('planner')) {
            emitAgentCompleted('planner', metadata)
          } else if (name?.toLowerCase().includes('executor')) {
            emitAgentCompleted('executor', metadata)
          } else if (name?.toLowerCase().includes('enrichment')) {
            emitAgentCompleted('enrichment', metadata)
          } else if (name?.toLowerCase().includes('classifier')) {
            emitAgentCompleted('classifier', metadata)
          }
          break
      }
    }),
    // Map to void since we're emitting side effects
    tap(() => {})
  ) as Observable<void>
}

