export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
  id: string
  role: ChatRole
  text: string
  plan?: import('./plan').Plan
}

export type ChatStreamMessage =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; error: string }
