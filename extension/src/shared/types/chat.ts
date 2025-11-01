export type ChatRole = 'user' | 'assistant' | 'system' | 'error'

export type ErrorDetails = {
  title?: string
  details?: string
  retryable: boolean
  retryPayload?: {
    messages: ChatMessage[]
  }
}

export type ChatMessage = {
  id: string
  role: ChatRole
  text: string
  plan?: import('./plan').Plan
  error?: ErrorDetails
  streaming?: boolean // Indicates message is still being streamed
  agent?: 'enrichment' | 'planner' | 'validator' | 'executor' // Which agent created this message
}

export type ChatStreamMessage =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; error: string }
