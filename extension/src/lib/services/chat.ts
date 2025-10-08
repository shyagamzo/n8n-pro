import { createChatPort } from './messaging'
import { useChatStore } from '../state/chatStore'
import { generateId } from '../utils/id'
import type { ChatMessage, ChatStreamMessage } from '../types/chat'
import type { BackgroundMessage, ApplyPlanRequest } from '../types/messaging'
import type { Plan } from '../types/plan'

export class ChatService
{
  private port = createChatPort()

  public constructor()
  {
    this.port.onMessage((raw: ChatStreamMessage | BackgroundMessage) =>
    {
      const { addMessage, finishSending, setAssistantDraft, setPendingPlan } = useChatStore.getState()

      const m = raw as ChatStreamMessage | BackgroundMessage

      if (m.type === 'token')
      {
        setAssistantDraft((useChatStore.getState().assistantDraft + m.token).slice())
      }
      else if (m.type === 'done')
      {
        const text = useChatStore.getState().assistantDraft
        const plan = useChatStore.getState().pendingPlan
        if (text) 
        {
          addMessage({ 
            id: generateId(), 
            role: 'assistant', 
            text,
            plan: plan || undefined
          })
        }
        setAssistantDraft('')
        setPendingPlan(null)
        finishSending()
      }
      else if (m.type === 'error')
      {
        setAssistantDraft('')
        setPendingPlan(null)
        finishSending()
        addMessage({ id: generateId(), role: 'assistant', text: `Error: ${m.error}` })
      }
      else if (m.type === 'plan')
      {
        setPendingPlan((m.plan as Plan))
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

  public applyPlan(plan: Plan): void
  {
    const req: ApplyPlanRequest = { type: 'apply_plan', plan }
    this.port.applyPlan(req)
  }
}

export const chat = new ChatService()


