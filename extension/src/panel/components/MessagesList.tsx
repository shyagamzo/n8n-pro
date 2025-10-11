import React, { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../lib/types/chat'
import MessageBubble from '../../lib/components/MessageBubble'
import Markdown from '../../lib/components/Markdown'
import ThinkingAnimation from '../../lib/components/ThinkingAnimation'
import ProgressIndicator from '../../lib/components/ProgressIndicator'
import EmptyState from './EmptyState'
import { useChatStore } from '../../lib/state/chatStore'
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
  const progress = useChatStore((state) => state.progress)
  const hasMessages = messages.length > 0 || sending || draft
  const messagesListRef = useRef<HTMLDivElement>(null)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)
  const [lastMessageCount, setLastMessageCount] = useState(messages.length)

  // Check if user has scrolled up from the bottom
  const handleScroll = () => {
    if (!messagesListRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10 // 10px threshold
    setIsUserScrolledUp(!isAtBottom)
  }

  // Auto-scroll to bottom when new messages arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (!messagesListRef.current) return

    // Only auto-scroll if:
    // 1. New messages arrived (message count increased)
    // 2. User hasn't manually scrolled up
    // 3. Or if it's the first message
    const shouldAutoScroll = messages.length > lastMessageCount && (!isUserScrolledUp || lastMessageCount === 0)
    
    if (shouldAutoScroll) {
      messagesListRef.current.scrollTo({
        top: messagesListRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }

    setLastMessageCount(messages.length)
  }, [messages.length, isUserScrolledUp, lastMessageCount])

  // Auto-scroll when draft changes or sending state changes (for typing indicators)
  useEffect(() => {
    if (!messagesListRef.current || isUserScrolledUp) return

    messagesListRef.current.scrollTo({
      top: messagesListRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [draft, sending, progress, isUserScrolledUp])

  return (
    <div 
      ref={messagesListRef}
      className="messages-list flex-1 flex-column overflow-y-auto gap-sm"
      onScroll={handleScroll}
    >
      {!hasMessages && <EmptyState onExampleClick={onSend} />}
      {messages.map((m) => (
        <div key={m.id} className={`message-wrapper flex w-full ${m.role === 'user' ? 'flex-justify-end' : ''}`}>
          <MessageBubble message={m} />
        </div>
      ))}
      {sending || draft || progress ? (
        <div className="message-wrapper flex w-full">
          <div className="draft-bubble">
            {progress ? (
              <ProgressIndicator 
                status={progress.status} 
                step={progress.step} 
                total={progress.total} 
              />
            ) : draft ? (
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


