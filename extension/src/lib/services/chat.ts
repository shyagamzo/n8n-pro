import { createChatPort } from './messaging'
import { useChatStore } from '../state/chatStore'
import { generateId } from '../utils/id'
import type { ChatMessage, ChatStreamMessage } from '../types/chat'

export class ChatService
{
  private port = createChatPort()

  public constructor()
  {
    this.port.onMessage((m: ChatStreamMessage) =>
    {
      const { addMessage, finishSending, setAssistantDraft } = useChatStore.getState()

      if (m.type === 'token')
      {
        setAssistantDraft((useChatStore.getState().assistantDraft + m.token).slice())
      }
      else if (m.type === 'done')
      {
        const text = useChatStore.getState().assistantDraft
        if (text) addMessage({ id: generateId(), role: 'assistant', text })
        setAssistantDraft('')
        finishSending()
      }
      else if (m.type === 'error')
      {
        setAssistantDraft('')
        finishSending()
        addMessage({ id: generateId(), role: 'assistant', text: `Error: ${m.error}` })
      }
    })
  }

  public send(text: string): void
  {
    const { addMessage, startSending, setAssistantDraft } = useChatStore.getState()
    addMessage({ id: generateId(), role: 'user', text })
    setAssistantDraft('')
    startSending()
    const messages: ChatMessage[] = useChatStore.getState().messages
    this.port.sendChat(messages)
  }
}

export const chat = new ChatService()


