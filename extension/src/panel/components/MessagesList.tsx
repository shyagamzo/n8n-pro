import React from 'react'
import type { ChatMessage } from '../../lib/types/chat'
import MessageBubble from '../../lib/components/MessageBubble'
import { messagesList, draftBubble } from '../styles'

type MessagesListProps = {
  messages: ChatMessage[]
  draft: string
  sending: boolean
}

export default function MessagesList({ messages, draft, sending }: MessagesListProps): React.ReactElement 
{
  return (
    <div style={messagesList}>
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {sending || draft ? (
        <div style={draftBubble}>{draft || '…'}</div>
      ) : null}
    </div>
  )
}


