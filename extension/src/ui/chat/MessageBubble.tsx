import React from 'react'
import type { ChatMessage } from '@shared/types/chat'
import Markdown from './Markdown'
import ErrorMessage from '@ui/feedback/ErrorMessage'
import PlanMessage from './PlanMessage'
import ThinkingAnimation from '@ui/feedback/ThinkingAnimation'
import { ProgressStepper } from '@ui/feedback'
import { getAgentMetadata } from '@ai/orchestrator/agent-metadata'
import { useChatStore } from '@ui/chatStore'
import { chat } from '@services/chat'
import './MessageBubble.css'

type MessageBubbleProps = {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps): React.ReactElement
{
  const bubbleClass = `message-bubble message-bubble--${message.role} ${message.streaming ? 'message-bubble--streaming' : ''}`

  // Get workflow state to determine if we should show progress stepper
  const workflowState = useChatStore(state => state.workflowState)
  const isWorkflowActive = workflowState && !['idle', 'completed', 'failed'].includes(workflowState.state)

  // Get agent metadata for display (replaces hardcoded getAgentInfo)
  const agentMeta = message.agent ? getAgentMetadata(message.agent) : null

  // Render error messages with ErrorMessage component
  if (message.error)
  {
    return (
      <div className={bubbleClass}>
        <ErrorMessage
          title={message.error.title}
          message={message.text}
          details={message.error.details}
          severity="error"
          onRetry={message.error.retryable && message.error.retryPayload
            ? () => chat.retry(message.error!.retryPayload!)
            : undefined
          }
        />
      </div>
    )
  }

  return (
    <div className={bubbleClass}>
      {message.streaming && !message.text ? (
        <>
          {/* Agent header with metadata */}
          {message.agent && agentMeta && (
            <div className="message-agent-label text-xs text-secondary mb-xs">
              {agentMeta.displayName}
            </div>
          )}
          <ThinkingAnimation />
          {/* Screen reader announcement for accessibility */}
          <span className="sr-only" role="status" aria-live="polite">
            {agentMeta?.workingMessage || 'Processing...'}
          </span>
        </>
      ) : (
        <>
          {/* Show agent name for assistant messages */}
          {message.role === 'assistant' && message.agent && agentMeta && (
            <div className="message-agent-badge mb-xs">
              <span className="agent-badge__name text-xs text-secondary">
                {agentMeta.displayName}
              </span>
            </div>
          )}

          <Markdown content={message.text} />
          {message.plan && <PlanMessage plan={message.plan} />}

          {/* Show progress stepper on assistant messages during workflow */}
          {message.role === 'assistant' && isWorkflowActive && !message.plan && (
            <ProgressStepper workflowState={workflowState} className="mt-sm" />
          )}
        </>
      )}
    </div>
  )
}
