import React from 'react'
import type { ChatMessage } from '../types/chat'
import Markdown from './Markdown'
import ErrorMessage from './ErrorMessage'
import PlanMessage from '../../panel/components/PlanMessage'
import { chat } from '../services/chat'
import './MessageBubble.css'

type MessageBubbleProps = {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps): React.ReactElement
{
  const bubbleClass = `message-bubble message-bubble--${message.role} ${message.streaming ? 'message-bubble--streaming' : ''}`

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
      <Markdown content={message.text} />
      {message.plan && <PlanMessage plan={message.plan} />}
    </div>
  )
}
