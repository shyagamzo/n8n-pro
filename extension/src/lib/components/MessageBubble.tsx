import React from 'react'
import type { ChatMessage } from '../types/chat'

type MessageBubbleProps = {
  message: ChatMessage
}

function getBubbleStyle(role: ChatMessage['role']): React.CSSProperties
{
  const base: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 8,
    maxWidth: '80%'
  }

  if (role === 'user')
  {
    return {
      ...base,
      alignSelf: 'flex-end',
      background: 'var(--color-primary, #4f46e5)',
      color: 'var(--color-on-primary, #fff)'
    }
  }

  return {
    ...base,
    alignSelf: 'flex-start',
    background: 'var(--color-surface-2, #f3f4f6)',
    color: 'var(--color-text, #111827)'
  }
}

export default function MessageBubble({ message }: MessageBubbleProps): React.ReactElement
{
  return (
    <div style={getBubbleStyle(message.role)}>
      {message.text}
    </div>
  )
}
