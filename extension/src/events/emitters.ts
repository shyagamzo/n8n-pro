/**
 * Helper functions for emitting events
 *
 * These functions encapsulate event creation logic, providing a clean API
 * for modules to emit events without manually constructing event objects.
 * They handle:
 * - Error normalization (unknown → Error)
 * - Timestamp generation
 * - Fixed string values (domain, type)
 * - User-friendly message generation
 */

import { END } from '@langchain/langgraph'

import { systemEvents } from './index'
import type {
  AgentType,
  Step,
  SystemEvent,
  WorkflowEvent,
  AgentEvent,
  GraphEvent,
  LLMEvent,
  ErrorEvent,
  StorageEvent,
  SystemInfoEvent,
  AgentMetadata,
  TokenCount,
  ErrorContext,
  StorageValue
} from './types'
import type { Workflow } from '@n8n/types'

/**
 * Low-level event emitters
 */

/**
 * Base event emitter - adds timestamp and emits
 */
function emitEvent(event: Omit<SystemEvent, 'timestamp'>): void
{
  systemEvents.emit({
    ...event,
    timestamp: Date.now()
  } as SystemEvent)
}

/**
 * Domain-specific event emitters
 */

function emitWorkflowEvent(type: WorkflowEvent['type'], payload: WorkflowEvent['payload']): void
{
  emitEvent({ domain: 'workflow', type, payload })
}

function emitAgentEvent(type: AgentEvent['type'], payload: AgentEvent['payload']): void
{
  emitEvent({ domain: 'agent', type, payload })
}

function emitGraphEvent(type: GraphEvent['type'], payload: GraphEvent['payload']): void
{
  emitEvent({ domain: 'graph', type, payload })
}

function emitLLMEvent(type: LLMEvent['type'], payload: LLMEvent['payload']): void
{
  emitEvent({ domain: 'llm', type, payload })
}

function emitErrorEvent(type: ErrorEvent['type'], payload: ErrorEvent['payload']): void
{
  emitEvent({ domain: 'error', type, payload })
}

function emitStorageEvent(type: StorageEvent['type'], payload: StorageEvent['payload']): void
{
  emitEvent({ domain: 'storage', type, payload })
}

function emitSystemInfoEvent(type: SystemInfoEvent['type'], payload: SystemInfoEvent['payload']): void
{
  emitEvent({ domain: 'system', type, payload })
}

/**
 * Workflow event emitters
 */

export function emitWorkflowCreated(workflow: Workflow | Partial<Workflow>, workflowId?: string): void
{
  emitWorkflowEvent('created', { workflow, workflowId })
}

export function emitWorkflowUpdated(workflow: Workflow | Partial<Workflow>, workflowId?: string): void
{
  emitWorkflowEvent('updated', { workflow, workflowId })
}

export function emitWorkflowValidated(workflow: Workflow | Partial<Workflow>): void
{
  emitWorkflowEvent('validated', { workflow })
}

export function emitWorkflowFailed(workflow: Workflow | Partial<Workflow>, error: Error): void
{
  emitWorkflowEvent('failed', { workflow, error })
}

/**
 * Agent event emitters
 */

export function emitAgentStarted(agent: AgentType, action: string, metadata?: AgentMetadata, sessionId?: string): void
{
  emitAgentEvent('started', { agent, action, metadata, sessionId })
}

export function emitAgentCompleted(agent: AgentType, metadata?: AgentMetadata, sessionId?: string): void
{
  emitAgentEvent('completed', { agent, metadata, sessionId })
}

export function emitAgentHandoff(fromAgent: AgentType, toAgent: AgentType, reason: string, sessionId?: string): void
{
  emitAgentEvent('handoff', { agent: fromAgent, action: `handoff to ${toAgent}: ${reason}`, sessionId })
}

export function emitToolStarted(agent: AgentType, tool: string, metadata?: AgentMetadata, sessionId?: string): void
{
  emitAgentEvent('tool_started', { agent, tool, metadata, sessionId })
}

export function emitToolCompleted(agent: AgentType, tool: string, metadata?: AgentMetadata, sessionId?: string): void
{
  emitAgentEvent('tool_completed', { agent, tool, metadata, sessionId })
}

/**
 * Graph event emitters
 */

export function emitGraphStarted(sessionId?: string): void
{
  emitGraphEvent('started', { sessionId })
}

export function emitGraphCompleted(sessionId?: string): void
{
  emitGraphEvent('completed', { sessionId })
}

export function emitGraphHandoff(fromStep: Step, toStep: Step | typeof END, reason?: string, sessionId?: string): void
{
  emitGraphEvent('handoff', { fromStep, toStep: toStep === END ? undefined : toStep, reason, sessionId })
}

/**
 * LLM event emitters
 */

export function emitLLMStarted(model?: string, provider?: string, runId?: string): void
{
  emitLLMEvent('started', { model, provider, runId })
}

export function emitLLMCompleted(tokens?: TokenCount, runId?: string): void
{
  emitLLMEvent('completed', { tokens, runId })
}

export function emitLLMToken(runId?: string): void
{
  emitLLMEvent('token', { runId })
}

/**
 * Error event emitters
 *
 * These normalize unknown errors to Error objects and generate user-friendly messages
 */

export function emitApiError(error: unknown, source: string, context?: ErrorContext): void
{
  const errorObj = error instanceof Error ? error : new Error(String(error))
  emitErrorEvent('api', { error: errorObj, source, context, userMessage: `API error in ${source}: ${errorObj.message}` })
}

export function emitUnhandledError(error: unknown, source: string, context?: ErrorContext): void
{
  const errorObj = error instanceof Error ? error : new Error(String(error))
  emitErrorEvent('unhandled', { error: errorObj, source, context, userMessage: 'An unexpected error occurred' })
}

export function emitSubscriberError(error: unknown, subscriberName: string, context?: ErrorContext): void
{
  const errorObj = error instanceof Error ? error : new Error(String(error))
  emitErrorEvent('subscriber', { error: errorObj, source: subscriberName, context, userMessage: `${subscriberName} encountered an error` })
}

export function emitValidationError(error: unknown, source: string, context?: ErrorContext): void
{
  const errorObj = error instanceof Error ? error : new Error(String(error))
  emitErrorEvent('validation', { error: errorObj, source, context, userMessage: `Validation error: ${errorObj.message}` })
}

export function emitSystemError(error: unknown, source: string, context?: ErrorContext): void
{
  const errorObj = error instanceof Error ? error : new Error(String(error))
  emitErrorEvent('system', { error: errorObj, source, context, userMessage: 'A system error occurred' })
}

/**
 * Storage event emitters
 */

export function emitStorageSave(key: string, value: StorageValue): void
{
  emitStorageEvent('save', { key, value })
}

export function emitStorageLoad(key: string, value: StorageValue): void
{
  emitStorageEvent('load', { key, value })
}

export function emitStorageClear(key: string): void
{
  emitStorageEvent('clear', { key })
}

/**
 * System info event emitters
 */

export function emitSystemInit(component: string, message: string, data?: Record<string, unknown>): void
{
  emitSystemInfoEvent('init', { component, message, level: 'info', data })
}

export function emitSystemInfo(component: string, message: string, data?: Record<string, unknown>): void
{
  emitSystemInfoEvent('info', { component, message, level: 'info', data })
}

export function emitSystemDebug(component: string, message: string, data?: Record<string, unknown>): void
{
  emitSystemInfoEvent('debug', { component, message, level: 'debug', data })
}

