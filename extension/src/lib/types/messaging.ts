import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'

export type ChatRequest = { type: 'chat'; messages: ChatMessage[] }

export type BackgroundMessage =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; error: string }
  | { type: 'plan'; plan: Plan }
  | { type: 'progress'; status: string; step: number; total: number }

export type ApplyPlanRequest = { type: 'apply_plan'; plan: Plan }
