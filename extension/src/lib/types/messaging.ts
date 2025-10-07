import type { ChatMessage } from '../types/chat'

export type ChatRequest = { type: 'chat'; messages: ChatMessage[] }

export type BackgroundMessage =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; error: string }
