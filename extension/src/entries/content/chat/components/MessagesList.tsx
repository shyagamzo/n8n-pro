import React, { useRef, useEffect, useState } from 'react'
import type { ChatMessage } from '@shared/types/chat'
import MessageBubble from '@ui/chat/MessageBubble'
import EmptyState from './EmptyState'
import '@ui/utilities.css'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isUserScrolled, setIsUserScrolled] = useState(false)

  // Detect if user has scrolled up
  useEffect(() =>
  {
    const container = containerRef.current
    if (!container) return

    const handleScroll = (): void =>
    {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10
      setIsUserScrolled(!isAtBottom)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() =>
  {
    if (!isUserScrolled && messagesEndRef.current)
    {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, draft, sending, isUserScrolled])

  return (
    <div ref={containerRef} className="messages-list flex-1 flex-column overflow-y-auto gap-sm">
      {!hasMessages && <EmptyState onExampleClick={onSend} />}
      {messages.map((m) => (
        <div key={m.id} className={`message-wrapper flex w-full ${m.role === 'user' ? 'flex-justify-end' : ''}`}>
          <MessageBubble message={m} />
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}


