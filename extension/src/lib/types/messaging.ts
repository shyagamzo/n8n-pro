export type ChatRequest = { type: 'chat'; text: string }

export type BackgroundMessage =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; error: string }


