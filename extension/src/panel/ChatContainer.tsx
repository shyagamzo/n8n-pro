import React from 'react'
import ChatPanel from './ChatPanel'
import { useChatStore } from '../lib/state/chatStore'
import { chat } from '../lib/services/chat'

export default function ChatContainer(): React.ReactElement | null
{
  const { isOpen, setOpen, messages, assistantDraft, sending, pendingPlan, setPendingPlan } = useChatStore()

  return (
    <ChatPanel
      open={isOpen}
      onClose={() => setOpen(false)}
      messages={messages}
      draft={assistantDraft}
      sending={sending}
      plan={pendingPlan ?? null}
      onSend={(text) => chat.send(text)}
      onCancelPlan={(): void => setPendingPlan(null)}
    />
  )
}


