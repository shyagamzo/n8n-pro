/**
 * Event system types for reactive architecture
 *
 * All events flow through the SystemEvents bus and are typed using these definitions.
 */

import type { Workflow } from '@n8n/types'

export type AgentType = 'planner' | 'executor' | 'enrichment' | 'orchestrator' | 'validator'

export type SystemEvent =
  | WorkflowEvent
  | AgentEvent
  | LLMEvent
  | ErrorEvent
  | StorageEvent
  | SystemInfoEvent

export type WorkflowEventPayload = {
  workflowId?: string
  workflow: Workflow | Partial<Workflow>
  error?: Error
}

export type WorkflowEvent = {
  domain: 'workflow'
  type: 'created' | 'updated' | 'validated' | 'failed'
  payload: WorkflowEventPayload
  timestamp: number
}

export type AgentMetadata = {
  inputTokens?: number
  outputTokens?: number
  duration?: number
  [key: string]: unknown
}

export type AgentEventPayload = {
  agent: AgentType
  action?: string
  tool?: string
  metadata?: AgentMetadata
  sessionId?: string
}

export type AgentEvent = {
  domain: 'agent'
  type: 'started' | 'completed' | 'handoff' | 'tool_started' | 'tool_completed'
  payload: AgentEventPayload
  timestamp: number
}

export type TokenCount = {
  prompt?: number
  completion?: number
  total?: number
}

export type LLMEventPayload = {
  model?: string
  provider?: string
  tokens?: TokenCount
  runId?: string
}

export type LLMEvent = {
  domain: 'llm'
  type: 'started' | 'completed' | 'token'
  payload: LLMEventPayload
  timestamp: number
}

export type ErrorContext = {
  requestId?: string
  endpoint?: string
  statusCode?: number
  workflow?: Partial<Workflow>
  [key: string]: unknown
}

export type ErrorEventPayload = {
  error: Error
  source: string
  context?: ErrorContext
  userMessage?: string
}

export type ErrorEvent = {
  domain: 'error'
  type: 'api' | 'subscriber' | 'unhandled' | 'llm' | 'validation' | 'system'
  payload: ErrorEventPayload
  timestamp: number
}

export type StorageValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[]
  | null

export type StorageEventPayload = {
  key: string
  value?: StorageValue
}

export type StorageEvent = {
  domain: 'storage'
  type: 'save' | 'load' | 'clear'
  payload: StorageEventPayload
  timestamp: number
}

export type SystemInfoEventPayload = {
  message: string
  component: string
  level: 'info' | 'debug'
  data?: Record<string, unknown>
}

export type SystemInfoEvent = {
  domain: 'system'
  type: 'info' | 'debug' | 'init'
  payload: SystemInfoEventPayload
  timestamp: number
}

export type AgentTrace = {
  sessionId: string
  events: SystemEvent[]
  startTime: number
  endTime?: number
}

