import { createChatPort } from './messaging'
import { useChatStore } from '../state/chatStore'
import { generateId } from '../utils/id'
import type { ChatMessage, ErrorDetails } from '../types/chat'
import type { BackgroundMessage, ApplyPlanRequest, AgentType } from '../types/messaging'
import type { Plan } from '../types/plan'

export class ChatService
{
  private port = createChatPort()
  private lastSentMessages: ChatMessage[] = []

  public constructor()
  {
    this.port.onMessage((message: BackgroundMessage) =>
    {
      // Route to appropriate handler - reads like English
      if (message.type === 'token') this.handleToken(message)
      else if (message.type === 'workflow_created') this.handleWorkflowCreated(message)
      else if (message.type === 'agent_activity') this.handleAgentActivity(message)
      else if (message.type === 'done') this.handleDone()
      else if (message.type === 'error') this.handleError(message)
      else if (message.type === 'plan') this.handlePlan(message)
    })
  }

  private handleToken(message: { type: 'token'; token: string }): void
  {
    const currentDraft = useChatStore.getState().assistantDraft
    useChatStore.getState().setAssistantDraft(currentDraft + message.token)
  }

  private handleWorkflowCreated(message: { type: 'workflow_created'; workflowId: string; workflowUrl: string }): void
  {
    useChatStore.getState().addToast({
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

  private handleAgentActivity(message: {
    type: 'agent_activity'
    agent: AgentType
    activity: string
    status: 'started' | 'working' | 'complete' | 'error'
    id: string
    timestamp: number
  }): void
  {
    console.info('📢 Received agent activity:', {
      agent: message.agent,
      activity: message.activity,
      status: message.status
    })

    useChatStore.getState().addActivity({
      id: message.id,
      agent: message.agent,
      activity: message.activity,
      status: message.status,
      timestamp: message.timestamp
    })
  }

  private handleDone(): void
  {
    const { assistantDraft, pendingPlan, addMessage, setAssistantDraft, setPendingPlan, finishSending } = useChatStore.getState()

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

  private handleError(message: { type: 'error'; error: string }): void
  {
    const { setAssistantDraft, setPendingPlan, finishSending, addMessage } = useChatStore.getState()

    setAssistantDraft('')
    setPendingPlan(null)
    finishSending()

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

  private handlePlan(message: { type: 'plan'; plan: Plan }): void
  {
    useChatStore.getState().setPendingPlan(message.plan)
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


