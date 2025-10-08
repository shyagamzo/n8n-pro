import React from 'react'
import type { ChatMessage } from '../types/chat'
import Markdown from './Markdown'
import PlanMessage from '../../panel/components/PlanMessage'
import { componentTokens } from '../styles/tokens'

type MessageBubbleProps = {
  message: ChatMessage
}

function getBubbleStyle(role: ChatMessage['role']): React.CSSProperties
{
  const baseStyle: React.CSSProperties = {
    maxWidth: '80%',
    wordWrap: 'break-word',
  }

  if (role === 'user')
  {
    return {
      ...baseStyle,
      ...componentTokens.messageBubble.user,
      alignSelf: 'flex-end',
    }
  }

  return {
    ...baseStyle,
    ...componentTokens.messageBubble.assistant,
    alignSelf: 'flex-start',
  }
}

export default function MessageBubble({ message }: MessageBubbleProps): React.ReactElement
{
  return (
    <div style={getBubbleStyle(message.role)}>
      <Markdown content={message.text} />
      {message.plan && <PlanMessage plan={message.plan} />}
    </div>
  )
}
