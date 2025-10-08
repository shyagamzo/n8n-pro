import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'

export type ChatRequest = { type: 'chat'; messages: ChatMessage[] }

export type BackgroundMessage =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; error: string }
  | { type: 'plan'; plan: Plan }
  | { type: 'progress'; status: string; step: number; total: number }
  | { type: 'workflow_created'; workflowId: string; workflowUrl: string }

export type ApplyPlanRequest = { type: 'apply_plan'; plan: Plan }

/**
 * Agent trace types for debugging multi-agent communication
 */
export type AgentType = 'classifier' | 'enrichment' | 'planner' | 'validator' | 'executor' | 'orchestrator'

export type AgentDecision = {
  agent: AgentType
  decision: string
  reasoning?: string
  timestamp: number
  durationMs?: number
  metadata?: Record<string, unknown>
}

export type AgentHandoff = {
  from: AgentType
  to: AgentType
  reason: string
  context?: Record<string, unknown>
  timestamp: number
}

export type AgentTrace = {
  traceId: string
  sessionId: string
  startTime: number
  endTime?: number
  decisions: AgentDecision[]
  handoffs: AgentHandoff[]
  llmCalls: Array<{
    agent: AgentType
    model: string
    promptTokens?: number
    completionTokens?: number
    durationMs: number
    timestamp: number
  }>
}
