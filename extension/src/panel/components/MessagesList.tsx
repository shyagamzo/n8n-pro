import React from 'react'
import type { ChatMessage } from '../../lib/types/chat'
import MessageBubble from '../../lib/components/MessageBubble'

type MessagesListProps = {
  messages: ChatMessage[]
  draft: string
  sending: boolean
}

export default function MessagesList({ messages, draft, sending }: MessagesListProps): React.ReactElement {
  return (
    <div style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {sending || draft ? (
        <div style={{ alignSelf: 'flex-start', background: 'var(--color-surface-2, #f3f4f6)', color: 'var(--color-text, #111827)', padding: '8px 10px', borderRadius: 8, maxWidth: '80%' }}>
          {draft || '…'}
        </div>
      ) : null}
    </div>
  )
}


