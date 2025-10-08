import React, { useEffect } from 'react'
import ChatPanel from './ChatPanel'
import { useChatStore } from '../lib/state/chatStore'
import { chat } from '../lib/services/chat'

export default function ChatContainer(): React.ReactElement | null
{
  const { isOpen, setOpen, messages, assistantDraft, sending, pendingPlan, setPendingPlan, clearSession, loadMessages } = useChatStore()

  // Load persisted messages on mount
  useEffect(() =>
  {
    loadMessages()
  }, [loadMessages])

  return (
    <ChatPanel
      open={isOpen}
      onClose={() => setOpen(false)}
      onNewSession={() =>
      {
        if (confirm('Start a new session? This will clear the current chat history.'))
        {
          clearSession()
        }
      }}
      messages={messages}
      draft={assistantDraft}
      sending={sending}
      plan={pendingPlan ?? null}
      onSend={(text) => chat.send(text)}
      onCancelPlan={(): void => setPendingPlan(null)}
    />
  )
}


