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
  const port = chrome.runtime.connect({ name: 'chat' })
  return {
    sendChat(messages: ChatMessage[])
    {
      port.postMessage({ type: 'chat', messages })
    },
    applyPlan(req: ApplyPlanRequest)
    {
      try
      {
        // Use one-off messaging for apply plan to avoid depending on a long-lived port
        chrome.runtime.sendMessage(req, () => void 0)
      }
      catch
      {
        // ignore
      }
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


