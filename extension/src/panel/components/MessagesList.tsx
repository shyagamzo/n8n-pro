import React from 'react'
import type { ChatMessage } from '../../lib/types/chat'
import MessageBubble from '../../lib/components/MessageBubble'
import Markdown from '../../lib/components/Markdown'
import ThinkingAnimation from '../../lib/components/ThinkingAnimation'
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
        <div style={draftBubble}>
          {draft ? <Markdown content={draft} /> : <ThinkingAnimation />}
        </div>
      ) : null}
    </div>
  )
}


