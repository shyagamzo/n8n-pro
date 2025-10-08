import React from 'react'
import type { ChatMessage } from '../../lib/types/chat'
import MessageBubble from '../../lib/components/MessageBubble'
import Markdown from '../../lib/components/Markdown'
import ThinkingAnimation from '../../lib/components/ThinkingAnimation'
import '../styles.css'

type MessagesListProps = {
  messages: ChatMessage[]
  draft: string
  sending: boolean
}

export default function MessagesList({ messages, draft, sending }: MessagesListProps): React.ReactElement
{
  return (
    <div className="messages-list">
      {messages.map((m) => (
        <div key={m.id} className={`message-wrapper message-wrapper--${m.role}`}>
          <MessageBubble message={m} />
        </div>
      ))}
      {sending || draft ? (
        <div className="message-wrapper message-wrapper--assistant">
          <div className="draft-bubble">
            {draft ? <Markdown content={draft} /> : <ThinkingAnimation />}
          </div>
        </div>
      ) : null}
    </div>
  )
}


