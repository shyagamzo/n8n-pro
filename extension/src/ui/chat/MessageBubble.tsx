import React from 'react'
import type { ChatMessage } from '@shared/types/chat'
import Markdown from './Markdown'
import ErrorMessage from '@ui/feedback/ErrorMessage'
import PlanMessage from './PlanMessage'
import ThinkingAnimation from '@ui/feedback/ThinkingAnimation'
import { chat } from '@services/chat'
import './MessageBubble.css'

type MessageBubbleProps = {
  message: ChatMessage
}

/**
 * Get user-friendly agent label and status message
 */
function getAgentInfo(agent?: string): { label: string; statusMessage: string }
{
  switch (agent)
  {
    case 'enrichment':
      return { label: 'Assistant', statusMessage: 'Understanding your requirements...' }
    case 'planner':
      return { label: 'Workflow Planner', statusMessage: 'Creating workflow plan...' }
    case 'validator':
      return { label: 'Validator', statusMessage: 'Validating workflow structure...' }
    case 'executor':
      return { label: 'Builder', statusMessage: 'Creating workflow in n8n...' }
    default:
      return { label: 'Assistant', statusMessage: 'Processing...' }
  }
}

export default function MessageBubble({ message }: MessageBubbleProps): React.ReactElement
{
  const bubbleClass = `message-bubble message-bubble--${message.role} ${message.streaming ? 'message-bubble--streaming' : ''}`
  const agentInfo = getAgentInfo(message.agent)

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
          {message.agent && (
            <div className="message-agent-label text-xs text-secondary mb-xs">
              {agentInfo.label}
            </div>
          )}
          <ThinkingAnimation />
          {/* Screen reader announcement for accessibility */}
          <span className="sr-only" role="status" aria-live="polite">
            {agentInfo.statusMessage}
          </span>
        </>
      ) : (
        <>
          <Markdown content={message.text} />
          {message.plan && <PlanMessage plan={message.plan} />}
        </>
      )}
    </div>
  )
}
