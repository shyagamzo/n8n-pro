import React from 'react'
import type { ChatMessage } from '../types/chat'
import Markdown from './Markdown'
import PlanMessage from '../../panel/components/PlanMessage'
import './MessageBubble.css'

type MessageBubbleProps = {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps): React.ReactElement
{
  const bubbleClass = `message-bubble message-bubble--${message.role}`

  return (
    <div className={bubbleClass}>
      <Markdown content={message.text} />
      {message.plan && <PlanMessage plan={message.plan} />}
    </div>
  )
}
