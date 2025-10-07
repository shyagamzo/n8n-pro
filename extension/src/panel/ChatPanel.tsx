import React, { useCallback, useEffect, useState } from 'react'
import Panel from '../lib/components/Panel'
import Button from '../lib/components/Button'
import Input from '../lib/components/Input'
import type { ChatMessage } from '../lib/types/chat'

type ChatPanelProps = {
  open: boolean
  onClose: () => void
  messages: ChatMessage[]
  draft: string
  sending: boolean
  onSend: (text: string) => void
}

export default function ChatPanel({ open, onClose, messages, draft, sending, onSend }: ChatPanelProps): React.ReactElement | null {
  const [input, setInput] = useState('')

  useEffect(() => {
    // no side-effects here; panel is purely presentational
  }, [])

  const sendMessage = useCallback(async (): Promise<void> => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    onSend(text)
  }, [input, onSend])

  if (!open) return null
  return (
    <Panel title="n8n Assistant" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map((m) => (
            <div key={m.id} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'var(--color-primary, #4f46e5)' : 'var(--color-surface-2, #f3f4f6)',
              color: m.role === 'user' ? 'var(--color-on-primary, #fff)' : 'var(--color-text, #111827)',
              padding: '8px 10px', borderRadius: 8, maxWidth: '80%'
            }}>
              {m.text}
            </div>
          ))}
          {sending || draft ? (
            <div style={{ alignSelf: 'flex-start', background: 'var(--color-surface-2, #f3f4f6)', color: 'var(--color-text, #111827)', padding: '8px 10px', borderRadius: 8, maxWidth: '80%' }}>
              {draft || '…'}
            </div>
          ) : null}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void sendMessage(); }} style={{ padding: 12, borderTop: '1px solid var(--color-border, #e5e7eb)', display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input value={input} onChange={(e) => setInput(e.currentTarget.value)} placeholder="Ask me to create or improve a workflow…" />
          </div>
          <Button type="submit" disabled={!input || sending}>Send</Button>
        </form>
      </div>
    </Panel>
  )
}


