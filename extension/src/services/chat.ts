import { ChatPort } from '@platform/messaging'
import { useChatStore } from '@ui/chatStore'
import { generateId } from '@shared/utils/id'
import type { ChatMessage, ErrorDetails } from '@shared/types/chat'
import type { BackgroundMessage, ApplyPlanRequest } from '@shared/types/messaging'
import type { Plan } from '@shared/types/plan'

export class ChatService
{
  private port = new ChatPort()
  private lastSentMessages: ChatMessage[] = []
  private streamingMessageId: string | null = null
  private currentAgent: string | null = null

  private messageHandlers: Record<string, (msg: any) => void> = {
    token: (msg) => this.handleToken(msg),
    workflow_created: (msg) => this.handleWorkflowCreated(msg),  // Toast notification
    done: () => this.handleDone(),
    error: (msg) => this.handleError(msg),
    plan: (msg) => this.handlePlan(msg),
    agent_activity: (msg) => this.handleAgentActivity(msg)
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

    // Don't show tokens for planner/validator agents - their output is Loom format
    // which is internal communication. The parsed plan will be shown in a nice UI card.
    if (this.currentAgent === 'planner' || this.currentAgent === 'validator') return

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
    // Clear pending plan to prevent re-attachment to subsequent messages
    useChatStore.getState().setPendingPlan(null)

    // Show success toast (UI-only feedback, not business logic)
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

  private handleDone(): void
  {
    const { pendingPlan, updateMessage, setPendingPlan, finishSending, messages } = useChatStore.getState()

    // Mark the streaming message as complete
    if (this.streamingMessageId)
    {
      const currentMessage = messages.find(m => m.id === this.streamingMessageId)

      // If we have a plan, clear the text to hide the Loom-formatted internal communication
      // The plan will be shown in a nice UI format via PlanMessage component
      const shouldClearText = !!pendingPlan && currentMessage?.text

      updateMessage(this.streamingMessageId, {
        streaming: false,
        plan: pendingPlan || undefined,
        ...(shouldClearText ? { text: '' } : {})
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

  private handleAgentActivity(message: { type: 'agent_activity'; agent: string; status: 'started' | 'working' | 'complete' | 'error' }): void
  {
    // When a new agent starts, create a new streaming message
    if (message.status === 'started')
    {
      // Finish the current streaming message if it exists
      if (this.streamingMessageId && this.currentAgent !== message.agent)
      {
        const currentMessage = useChatStore.getState().messages.find(m => m.id === this.streamingMessageId)

        // Remove empty messages, except for planner/validator which may get a plan attached later
        const shouldKeepEmpty = this.currentAgent === 'planner' || this.currentAgent === 'validator'

        if (currentMessage && !currentMessage.text && !shouldKeepEmpty)
        {
          useChatStore.setState({
            messages: useChatStore.getState().messages.filter(m => m.id === this.streamingMessageId)
          })
        }
        else
        {
          useChatStore.getState().updateMessage(this.streamingMessageId, {
            streaming: false
          })
        }
      }

      // Don't create a streaming message for executor - it doesn't produce text output
      // Success feedback is shown via workflow_created toast
      if (message.agent === 'executor')
      {
        this.currentAgent = 'executor'
        this.streamingMessageId = null
        return
      }

      // Create new streaming message for this agent
      this.currentAgent = message.agent
      this.streamingMessageId = generateId()
      useChatStore.getState().addMessage({
        id: this.streamingMessageId,
        role: 'assistant',
        text: '',
        streaming: true,
        agent: message.agent as any // Track which agent is creating this message
      })
    }
    else if (message.status === 'complete' && message.agent === this.currentAgent)
    {
      // Agent completed - mark message as done or remove if empty
      if (this.streamingMessageId)
      {
        const currentMessage = useChatStore.getState().messages.find(m => m.id === this.streamingMessageId)

        // Remove empty messages, except for planner/validator which will get a plan attached later
        const shouldKeepEmpty = this.currentAgent === 'planner' || this.currentAgent === 'validator'

        if (currentMessage && !currentMessage.text && !shouldKeepEmpty)
        {
          useChatStore.setState({
            messages: useChatStore.getState().messages.filter(m => m.id !== this.streamingMessageId)
          })
        }
        else
        {
          useChatStore.getState().updateMessage(this.streamingMessageId, {
            streaming: false
          })
        }
      }

      this.currentAgent = null
    }
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


