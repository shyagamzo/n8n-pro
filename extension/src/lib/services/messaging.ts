import type { ChatStreamMessage, ChatMessage } from '../types/chat'
import type { ApplyPlanRequest } from '../types/messaging'

export type ChatPort = {
  sendChat: (messages: ChatMessage[]) => void
  applyPlan: (req: ApplyPlanRequest) => void
  onMessage: (cb: (m: ChatStreamMessage) => void) => void
  disconnect: () => void
}

export function createChatPort(): ChatPort
{
  let port = chrome.runtime.connect({ name: 'chat' })
  let disconnected = false
  port.onDisconnect.addListener(() => { disconnected = true })

  const ensurePort = (): void =>
  {
    if (!disconnected) return
    try
    {
      port = chrome.runtime.connect({ name: 'chat' })
      disconnected = false
      port.onDisconnect.addListener(() => { disconnected = true })
    }
    catch
    {
      // ignore
    }
  }

  const safePost = (data: Record<string, unknown>): void =>
  {
    try { port.postMessage(data) }
    catch
    {
      // reconnect once and retry
      ensurePort()
      try { port.postMessage(data) }
      catch
      {
        // ignore
      }
    }
  }

  return {
    sendChat(messages: ChatMessage[])
    {
      ensurePort()
      safePost({ type: 'chat', messages })
    },
    applyPlan(req: ApplyPlanRequest)
    {
      ensurePort()
      safePost(req)
    },
    onMessage(cb)
    {
      port.onMessage.addListener((m: ChatStreamMessage) => cb(m))
    },
    disconnect()
    {
      try { port.disconnect() }
      catch
      {
        // ignore
      }
    }
  }
}


