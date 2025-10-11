/**
 * Event system types for reactive architecture
 * 
 * All events flow through the SystemEvents bus and are typed using these definitions.
 */

import type { Workflow } from '../types/workflow'

export type AgentType = 'planner' | 'executor' | 'enrichment' | 'classifier' | 'orchestrator'

export type SystemEvent = 
  | WorkflowEvent
  | AgentEvent
  | LLMEvent
  | ErrorEvent
  | StorageEvent

export type WorkflowEvent = {
  domain: 'workflow'
  type: 'created' | 'updated' | 'validated' | 'failed'
  payload: {
    workflowId?: string
    workflow: Workflow
    error?: Error
  }
  timestamp: number
}

export type AgentEvent = {
  domain: 'agent'
  type: 'started' | 'completed' | 'handoff' | 'tool_started' | 'tool_completed'
  payload: {
    agent: AgentType
    action?: string
    tool?: string
    metadata?: unknown
    sessionId?: string
  }
  timestamp: number
}

export type LLMEvent = {
  domain: 'llm'
  type: 'started' | 'completed' | 'token'
  payload: {
    model?: string
    provider?: string
    tokens?: {
      prompt?: number
      completion?: number
    }
    runId?: string
  }
  timestamp: number
}

export type ErrorEvent = {
  domain: 'error'
  type: 'api' | 'subscriber' | 'unhandled' | 'llm' | 'validation' | 'system'
  payload: {
    error: Error
    source: string
    context?: unknown
    userMessage?: string
  }
  timestamp: number
}

export type StorageEvent = {
  domain: 'storage'
  type: 'save' | 'load' | 'clear'
  payload: {
    key: string
    value?: unknown
  }
  timestamp: number
}

export type AgentTrace = {
  sessionId: string
  events: SystemEvent[]
  startTime: number
  endTime?: number
}

