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
}

export type ChatStreamMessage =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; error: string }
