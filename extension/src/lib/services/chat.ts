import { ChatPort } from './messaging'
import { useChatStore } from '../state/chatStore'
import { generateId } from '../utils/id'
import type { ChatMessage, ErrorDetails } from '../types/chat'
import type { BackgroundMessage, ApplyPlanRequest, AgentType } from '../types/messaging'
import type { Plan } from '../types/plan'

export class ChatService
{
  private port = new ChatPort()
  private lastSentMessages: ChatMessage[] = []
  private streamingMessageId: string | null = null

  private messageHandlers: Record<string, (msg: any) => void> = {
    token: (msg) => this.handleToken(msg),
    workflow_created: (msg) => this.handleWorkflowCreated(msg),
    agent_activity: (msg) => this.handleAgentActivity(msg),
    done: () => this.handleDone(),
    error: (msg) => this.handleError(msg),
    plan: (msg) => this.handlePlan(msg),
  }

  public constructor()
  {
    this.port.onMessage((message: BackgroundMessage) =>
    {
      this.messageHandlers[message.type]?.(message)
    })
  }

  private handleToken(message: { type: 'token'; token: string }): void
  {
    // Update existing streaming message
    if (!this.streamingMessageId) return

    const currentMessage = useChatStore.getState().messages.find(m => m.id === this.streamingMessageId)
    if (currentMessage)
    {
      useChatStore.getState().updateMessage(this.streamingMessageId, {
        text: currentMessage.text + message.token
      })
    }
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
    const { pendingPlan, updateMessage, setPendingPlan, finishSending } = useChatStore.getState()

    // Mark the streaming message as complete
    if (this.streamingMessageId)
    {
      updateMessage(this.streamingMessageId, {
        streaming: false,
        plan: pendingPlan || undefined
      })
      this.streamingMessageId = null
    }

    setPendingPlan(null)
    finishSending()
  }

  private handleError(message: { type: 'error'; error: string }): void
  {
    const { setPendingPlan, finishSending, addMessage, messages } = useChatStore.getState()

    // Remove streaming message if it exists
    if (this.streamingMessageId)
    {
      const streamingMsg = messages.find(m => m.id === this.streamingMessageId)
      if (streamingMsg)
      {
        // Remove the incomplete streaming message
        useChatStore.setState({ messages: messages.filter(m => m.id !== this.streamingMessageId) })
      }
      this.streamingMessageId = null
    }

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
    const { addMessage, startSending } = useChatStore.getState()
    addMessage({ id: generateId(), role: 'user', text })

    // Create streaming message immediately to avoid animation reset
    this.streamingMessageId = generateId()
    addMessage({
      id: this.streamingMessageId,
      role: 'assistant',
      text: '',
      streaming: true
    })

    startSending()

    // Filter out streaming messages before sending to backend
    const currentMessages: ChatMessage[] = useChatStore.getState().messages.filter(m => !m.streaming)
    this.lastSentMessages = currentMessages
    this.port.sendChat(currentMessages)
  }

  public retry(payload: { messages: ChatMessage[] }): void
  {
    const { startSending } = useChatStore.getState()

    startSending()
    this.streamingMessageId = null // Reset streaming message ID

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


