import { ChatPort } from '@platform/messaging'
import { useChatStore } from '@ui/chatStore'
import { generateId } from '@shared/utils/id'
import { DEFAULTS } from '@shared/constants'
import type { ChatMessage, ErrorDetails } from '@shared/types/chat'
import type { BackgroundMessage, ApplyPlanRequest } from '@shared/types/messaging'
import type { Plan } from '@shared/types/plan'
import type { WorkflowState, WorkflowStateData } from '@shared/types/workflow-state'

// ─────────────────────────────────────────────────────────────
// Type-safe message handlers
// ─────────────────────────────────────────────────────────────

/**
 * Extract message type from BackgroundMessage union
 */
type ExtractMessage<T extends BackgroundMessage['type']> = Extract<BackgroundMessage, { type: T }>

/**
 * Type-safe message handler registry (partial - not all message types need handlers)
 */
type MessageHandlers = {
  token: (msg: ExtractMessage<'token'>) => void
  workflow_created: (msg: ExtractMessage<'workflow_created'>) => void
  done: (msg: ExtractMessage<'done'>) => void
  error: (msg: ExtractMessage<'error'>) => void
  agent_activity: (msg: ExtractMessage<'agent_activity'>) => void
  state_transition: (msg: ExtractMessage<'state_transition'>) => void
}

export class ChatService
{
  private port = new ChatPort()
  private lastSentMessages: ChatMessage[] = []
  private streamingMessageId: string | null = null
  private currentAgent: string | null = null

  private messageHandlers: MessageHandlers = {
    token: (msg) => this.handleToken(msg),
    workflow_created: (msg) => this.handleWorkflowCreated(msg),
    done: () => this.handleDone(),
    error: (msg) => this.handleError(msg),
    agent_activity: (msg) => this.handleAgentActivity(msg),
    state_transition: (msg) => this.handleStateTransition(msg)
  }

  public constructor()
  {
    this.port.onMessage((message: BackgroundMessage) =>
    {
      const handler = this.messageHandlers[message.type as keyof MessageHandlers]
      if (handler)
      {
        handler(message as never) // Type assertion needed due to discriminated union complexity
      }
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
    // Show success toast (UI-only feedback, not business logic)
    useChatStore.getState().addToast({
      id: `workflow-${message.workflowId}`,
      type: 'success',
      message: 'Workflow created successfully!',
      action: {
        label: 'Open in n8n',
        onClick: () => window.open(message.workflowUrl, '_blank')
      },
      duration: DEFAULTS.TOAST_DURATION_SUCCESS
    })
  }

  private handleDone(): void
  {
    const { workflowState, updateMessage, finishSending, messages } = useChatStore.getState()

    // Mark the streaming message as complete
    if (this.streamingMessageId)
    {
      const currentMessage = messages.find(m => m.id === this.streamingMessageId)

      // If we have a plan, clear the text to hide the Loom-formatted internal communication
      // The plan will be shown in a nice UI format via PlanMessage component
      const shouldClearText = !!workflowState.plan && currentMessage?.text

      updateMessage(this.streamingMessageId, {
        streaming: false,
        plan: workflowState.plan || undefined,
        ...(shouldClearText ? { text: '' } : {})
      })
      this.streamingMessageId = null
    }

    finishSending()
  }

  private handleError(message: { type: 'error'; error: string }): void
  {
    const { finishSending, addMessage, messages } = useChatStore.getState()

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

  private handleStateTransition(message: {
    type: 'state_transition'
    previous: WorkflowState
    current: WorkflowState
    trigger: string
    stateData: WorkflowStateData
  }): void
  {
    const { setWorkflowState } = useChatStore.getState()

    // Update chatStore with new workflow state
    setWorkflowState(message.stateData)

    // Development-only: Log state transitions
    if (import.meta.env.DEV)
    {
      console.info(`[WorkflowState] ${message.previous} → ${message.current}`, {
        trigger: message.trigger,
        state: message.stateData
      })
    }
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


