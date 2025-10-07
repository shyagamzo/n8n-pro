import React from 'react'
import Panel from '../lib/components/Panel'
import type { ChatMessage } from '../lib/types/chat'
import MessagesList from './components/MessagesList'
import ChatComposer from './components/ChatComposer'

type ChatPanelProps = {
  open: boolean
  onClose: () => void
  messages: ChatMessage[]
  draft: string
  sending: boolean
  onSend: (text: string) => void
}

export default function ChatPanel({ open, onClose, messages, draft, sending, onSend }: ChatPanelProps): React.ReactElement | null {

  // Presentational only

  if (!open) return null
  return (
    <Panel title="n8n Assistant" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <MessagesList messages={messages} draft={draft} sending={sending} />
        <ChatComposer sending={sending} onSend={(text) => onSend(text)} />
      </div>
    </Panel>
  )
}


