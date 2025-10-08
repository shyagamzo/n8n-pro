import { createChatPort } from './messaging'
import { useChatStore } from '../state/chatStore'
import { generateId } from '../utils/id'
import type { ChatMessage, ChatStreamMessage, ErrorDetails } from '../types/chat'
import type { BackgroundMessage, ApplyPlanRequest } from '../types/messaging'
import type { Plan } from '../types/plan'

export class ChatService
{
  private port = createChatPort()
  private lastSentMessages: ChatMessage[] = []

  public constructor()
  {
    this.port.onMessage((message: ChatStreamMessage | BackgroundMessage) =>
    {
      const { addMessage, finishSending, setAssistantDraft, setPendingPlan, setProgress, addToast } = useChatStore.getState()

      if (message.type === 'token')
      {
        const currentDraft = useChatStore.getState().assistantDraft
        setAssistantDraft(currentDraft + message.token)
      }
      else if (message.type === 'progress')
      {
        setProgress({ status: message.status, step: message.step, total: message.total })
      }
      else if (message.type === 'workflow_created')
      {
        // Show success toast with link to workflow
        addToast({
          id: `workflow-${message.workflowId}`,
          type: 'success',
          message: 'Workflow created successfully!',
          action: {
            label: 'Open in n8n',
            onClick: () => window.open(message.workflowUrl, '_blank')
          },
          duration: 7000
        })
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
        
        // Create error message with retry capability
        const errorDetails: ErrorDetails = {
          title: this.getErrorTitle(message.error),
          details: this.getErrorDetails(message.error),
          retryable: this.isRetryable(message.error),
          retryPayload: this.isRetryable(message.error) 
            ? { messages: this.lastSentMessages }
            : undefined
        }

        addMessage({ 
          id: generateId(), 
          role: 'error', 
          text: this.getErrorMessage(message.error),
          error: errorDetails
        })
      }
      else if (message.type === 'plan')
      {
        setPendingPlan(message.plan)
      }
    })
  }

  private getErrorTitle(error: string): string
  {
    if (error.includes('API key')) return 'API Key Error'
    if (error.includes('network') || error.includes('fetch')) return 'Network Error'
    if (error.includes('workflow')) return 'Workflow Creation Failed'
    if (error.includes('plan')) return 'Planning Failed'
    return 'Error'
  }

  private getErrorMessage(error: string): string
  {
    // Extract the main error message without redundant prefixes
    return error.replace(/^Error:\s*/i, '')
  }

  private getErrorDetails(error: string): string | undefined
  {
    // Provide additional context based on error type
    if (error.includes('API key'))
    {
      return 'Go to Options (click extension icon) to configure your API keys.'
    }

    if (error.includes('network') || error.includes('fetch'))
    {
      return 'Check your internet connection and ensure n8n is running on localhost:5678'
    }

    return undefined
  }

  private isRetryable(error: string): boolean
  {
    // Determine if error can be retried
    if (error.includes('API key not set')) return false // Needs configuration
    if (error.includes('network') || error.includes('timeout')) return true
    if (error.includes('Failed to generate') || error.includes('Failed to create')) return true
    return true // Default to retryable
  }

  public send(text: string): void
  {
    const { addMessage, startSending, setAssistantDraft } = useChatStore.getState()
    addMessage({ id: generateId(), role: 'user', text })
    setAssistantDraft('')
    startSending()

    const currentMessages: ChatMessage[] = useChatStore.getState().messages
    this.lastSentMessages = currentMessages
    this.port.sendChat(currentMessages)
  }

  public retry(payload: { messages: ChatMessage[] }): void
  {
    const { startSending, setAssistantDraft } = useChatStore.getState()

    startSending()
    setAssistantDraft('')

    this.lastSentMessages = payload.messages
    this.port.sendChat(payload.messages)
  }

  public applyPlan(plan: Plan): void
  {
    const req: ApplyPlanRequest = { type: 'apply_plan', plan }
    this.port.applyPlan(req)
  }
}

export const chat = new ChatService()


