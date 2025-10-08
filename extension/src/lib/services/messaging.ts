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
    catch (error)
    {
      // Extension context invalidated or background not available
      console.warn('Failed to reconnect chat port:', error)
    }
  }

  const safePost = (data: Record<string, unknown>): void =>
  {
    try
    {
      port.postMessage(data)
    }
    catch (error)
    {
      // Reconnect once and retry
      console.warn('Port disconnected, attempting reconnect:', error)
      ensurePort()

      try
      {
        port.postMessage(data)
      }
      catch (retryError)
      {
        // Failed after retry - extension context likely invalidated
        console.error('Failed to send message after reconnect:', retryError)
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
      try
      {
        port.disconnect()
      }
      catch (error)
      {
        // Port already disconnected or extension context invalidated
        console.warn('Failed to disconnect port:', error)
      }
    }
  }
}


