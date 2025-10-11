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

import { systemEvents } from './index'
import type { AgentType } from './types'

/**
 * Workflow event emitters
 */

export function emitWorkflowCreated(workflow: any, workflowId?: string): void {
  systemEvents.emit({
    domain: 'workflow',
    type: 'created',
    payload: { workflow, workflowId },
    timestamp: Date.now()
  })
}

export function emitWorkflowUpdated(workflow: any, workflowId?: string): void {
  systemEvents.emit({
    domain: 'workflow',
    type: 'updated',
    payload: { workflow, workflowId },
    timestamp: Date.now()
  })
}

export function emitWorkflowValidated(workflow: any): void {
  systemEvents.emit({
    domain: 'workflow',
    type: 'validated',
    payload: { workflow },
    timestamp: Date.now()
  })
}

export function emitWorkflowFailed(workflow: any, error: Error): void {
  systemEvents.emit({
    domain: 'workflow',
    type: 'failed',
    payload: { workflow, error },
    timestamp: Date.now()
  })
}

/**
 * Agent event emitters
 */

export function emitAgentStarted(agent: AgentType, action: string, metadata?: unknown): void {
  systemEvents.emit({
    domain: 'agent',
    type: 'started',
    payload: { agent, action, metadata },
    timestamp: Date.now()
  })
}

export function emitAgentCompleted(agent: AgentType, metadata?: unknown): void {
  systemEvents.emit({
    domain: 'agent',
    type: 'completed',
    payload: { agent, metadata },
    timestamp: Date.now()
  })
}

export function emitAgentHandoff(fromAgent: AgentType, toAgent: AgentType, reason: string): void {
  systemEvents.emit({
    domain: 'agent',
    type: 'handoff',
    payload: { agent: fromAgent, action: `handoff to ${toAgent}: ${reason}` },
    timestamp: Date.now()
  })
}

export function emitToolStarted(agent: AgentType, tool: string, metadata?: unknown): void {
  systemEvents.emit({
    domain: 'agent',
    type: 'tool_started',
    payload: { agent, tool, metadata },
    timestamp: Date.now()
  })
}

export function emitToolCompleted(agent: AgentType, tool: string, metadata?: unknown): void {
  systemEvents.emit({
    domain: 'agent',
    type: 'tool_completed',
    payload: { agent, tool, metadata },
    timestamp: Date.now()
  })
}

/**
 * LLM event emitters
 */

export function emitLLMStarted(model?: string, provider?: string, runId?: string): void {
  systemEvents.emit({
    domain: 'llm',
    type: 'started',
    payload: { model, provider, runId },
    timestamp: Date.now()
  })
}

export function emitLLMCompleted(tokens?: { prompt?: number; completion?: number }, runId?: string): void {
  systemEvents.emit({
    domain: 'llm',
    type: 'completed',
    payload: { tokens, runId },
    timestamp: Date.now()
  })
}

export function emitLLMToken(token: string, runId?: string): void {
  systemEvents.emit({
    domain: 'llm',
    type: 'token',
    payload: { runId },
    timestamp: Date.now()
  })
}

/**
 * Error event emitters
 * 
 * These normalize unknown errors to Error objects and generate user-friendly messages
 */

export function emitApiError(error: unknown, source: string, context?: unknown): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  systemEvents.emit({
    domain: 'error',
    type: 'api',
    payload: {
      error: errorObj,
      source,
      context,
      userMessage: `API error in ${source}: ${errorObj.message}`
    },
    timestamp: Date.now()
  })
}

export function emitUnhandledError(error: unknown, source: string): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  systemEvents.emit({
    domain: 'error',
    type: 'unhandled',
    payload: {
      error: errorObj,
      source,
      userMessage: 'An unexpected error occurred'
    },
    timestamp: Date.now()
  })
}

export function emitSubscriberError(error: unknown, subscriberName: string): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  systemEvents.emit({
    domain: 'error',
    type: 'subscriber',
    payload: {
      error: errorObj,
      source: subscriberName,
      userMessage: `${subscriberName} encountered an error`
    },
    timestamp: Date.now()
  })
}

export function emitValidationError(error: unknown, source: string, context?: unknown): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  systemEvents.emit({
    domain: 'error',
    type: 'validation',
    payload: {
      error: errorObj,
      source,
      context,
      userMessage: `Validation error: ${errorObj.message}`
    },
    timestamp: Date.now()
  })
}

export function emitSystemError(error: unknown, source: string): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  systemEvents.emit({
    domain: 'error',
    type: 'system',
    payload: {
      error: errorObj,
      source,
      userMessage: 'A system error occurred'
    },
    timestamp: Date.now()
  })
}

/**
 * Storage event emitters
 */

export function emitStorageSave(key: string, value: unknown): void {
  systemEvents.emit({
    domain: 'storage',
    type: 'save',
    payload: { key, value },
    timestamp: Date.now()
  })
}

export function emitStorageLoad(key: string, value: unknown): void {
  systemEvents.emit({
    domain: 'storage',
    type: 'load',
    payload: { key, value },
    timestamp: Date.now()
  })
}

export function emitStorageClear(key: string): void {
  systemEvents.emit({
    domain: 'storage',
    type: 'clear',
    payload: { key },
    timestamp: Date.now()
  })
}

