import type { ChatStreamMessage, ChatMessage } from '../types/chat'

export type ChatPort = {
  sendChat: (messages: ChatMessage[]) => void
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


