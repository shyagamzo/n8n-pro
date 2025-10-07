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
        // Send via the existing long-lived port so background can reply on the same channel
        port.postMessage(req)
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


