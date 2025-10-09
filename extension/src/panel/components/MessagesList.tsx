import React from 'react'
import type { ChatMessage } from '../../lib/types/chat'
import MessageBubble from '../../lib/components/MessageBubble'
import Markdown from '../../lib/components/Markdown'
import ThinkingAnimation from '../../lib/components/ThinkingAnimation'
import EmptyState from './EmptyState'
import '../../lib/styles/utilities.css'
import '../styles.css'

type MessagesListProps = {
  messages: ChatMessage[]
  draft: string
  sending: boolean
  onSend: (text: string) => void
}

export default function MessagesList({ messages, draft, sending, onSend }: MessagesListProps): React.ReactElement
{
  const hasMessages = messages.length > 0 || sending || draft

  return (
    <div className="messages-list flex-1 flex-column overflow-y-auto gap-sm">
      {!hasMessages && <EmptyState onExampleClick={onSend} />}
      {messages.map((m) => (
        <div key={m.id} className={`message-wrapper flex w-full ${m.role === 'user' ? 'flex-justify-end' : ''}`}>
          <MessageBubble message={m} />
        </div>
      ))}
      {sending || draft ? (
        <div className="message-wrapper flex w-full">
          <div className="draft-bubble">
            {draft ? (
              <Markdown content={draft} />
            ) : (
              <ThinkingAnimation />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}


