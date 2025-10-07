import React from 'react'
import ChatPanel from './ChatPanel'
import { useChatStore } from '../lib/state/chatStore'
import { chat } from '../lib/services/chat'

export default function ChatContainer(): React.ReactElement | null {
  const { isOpen, setOpen, messages, assistantDraft, sending } = useChatStore()

  return (
    <ChatPanel
      open={isOpen}
      onClose={() => setOpen(false)}
      messages={messages}
      draft={assistantDraft}
      sending={sending}
      onSend={(text) => chat.send(text)}
    />
  )
}


