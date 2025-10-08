import React from 'react'
import type { ChatMessage } from '../../lib/types/chat'
import MessageBubble from '../../lib/components/MessageBubble'
import Markdown from '../../lib/components/Markdown'
import ThinkingAnimation from '../../lib/components/ThinkingAnimation'
import '../../lib/styles/utilities.css'
import '../styles.css'

type MessagesListProps = {
  messages: ChatMessage[]
  draft: string
  sending: boolean
}

export default function MessagesList({ messages, draft, sending }: MessagesListProps): React.ReactElement
{
  return (
    <div className="messages-list flex-1 flex-column overflow-y-auto gap-sm">
      {messages.map((m) => (
        <div key={m.id} className={`message-wrapper flex w-full ${m.role === 'user' ? 'flex-justify-end' : ''}`}>
          <MessageBubble message={m} />
        </div>
      ))}
      {sending || draft ? (
        <div className="message-wrapper flex w-full">
          <div className="draft-bubble">
            {draft ? <Markdown content={draft} /> : <ThinkingAnimation />}
          </div>
        </div>
      ) : null}
    </div>
  )
}


