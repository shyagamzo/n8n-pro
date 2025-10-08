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
    this.port.onMessage((message: ChatStreamMessage | BackgroundMessage) =>
    {
      const { addMessage, finishSending, setAssistantDraft, setPendingPlan } = useChatStore.getState()

      if (message.type === 'token')
      {
        const currentDraft = useChatStore.getState().assistantDraft
        setAssistantDraft(currentDraft + message.token)
      }
      else if (message.type === 'done')
      {
        const { assistantDraft, pendingPlan } = useChatStore.getState()

        if (assistantDraft)
        {
          addMessage({
            id: generateId(),
            role: 'assistant',
            text: assistantDraft,
            plan: pendingPlan || undefined
          })
        }

        setAssistantDraft('')
        setPendingPlan(null)
        finishSending()
      }
      else if (message.type === 'error')
      {
        setAssistantDraft('')
        setPendingPlan(null)
        finishSending()
        addMessage({ id: generateId(), role: 'assistant', text: `Error: ${message.error}` })
      }
      else if (message.type === 'plan')
      {
        setPendingPlan(message.plan)
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


