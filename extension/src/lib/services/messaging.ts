import type { ChatStreamMessage } from '../types/chat'

export type ChatPort = {
  sendChat: (text: string) => void
  onMessage: (cb: (m: ChatStreamMessage) => void) => void
  disconnect: () => void
}

export function createChatPort(): ChatPort {
  const port = chrome.runtime.connect({ name: 'chat' })
  return {
    sendChat(text: string) {
      port.postMessage({ type: 'chat', text })
    },
    onMessage(cb) {
      port.onMessage.addListener((m: ChatStreamMessage) => cb(m))
    },
    disconnect() {
      try { port.disconnect() } catch {
        // ignore
      }
    }
  }
}


