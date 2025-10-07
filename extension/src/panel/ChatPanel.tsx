import React, { useEffect, useMemo, useRef, useState } from 'react'
import Panel from '../lib/components/Panel'
import Button from '../lib/components/Button'
import Input from '../lib/components/Input'
import { useChatStore } from '../lib/state/chatStore'

export default function ChatPanel(): React.ReactElement | null {
  const { isOpen, setOpen, messages, addMessage, startSending, finishSending, sending } = useChatStore()
  const [input, setInput] = useState('')
  const portRef = useRef<chrome.runtime.Port | null>(null)
  const [streamBuffer, setStreamBuffer] = useState('')

  const container = useMemo(() => (
    <Panel title="n8n Assistant" onClose={() => setOpen(false)}>
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
          {sending || streamBuffer ? (
            <div style={{ alignSelf: 'flex-start', background: 'var(--color-surface-2, #f3f4f6)', color: 'var(--color-text, #111827)', padding: '8px 10px', borderRadius: 8, maxWidth: '80%' }}>
              {streamBuffer || '…'}
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
  ), [isOpen, messages, input, sending, streamBuffer])

  useEffect(() => {
    if (!isOpen) return
    // lazy open port
    if (!portRef.current) {
      const port = chrome.runtime.connect({ name: 'chat' })
      port.onMessage.addListener((msg: any) => {
        if (msg?.type === 'token') {
          setStreamBuffer((prev) => prev + (msg.token as string))
        } else if (msg?.type === 'done') {
          if (streamBuffer) {
            addMessage({ id: crypto.randomUUID(), role: 'assistant', text: streamBuffer })
            setStreamBuffer('')
          }
          finishSending()
        } else if (msg?.type === 'error') {
          finishSending()
          setStreamBuffer('')
          addMessage({ id: crypto.randomUUID(), role: 'assistant', text: `Error: ${msg.error}` })
        }
      })
      portRef.current = port
    }
    return () => {
      // keep port alive while panel open
    }
  }, [isOpen])

  async function sendMessage(): Promise<void> {
    if (!input.trim()) return
    const text = input.trim()
    addMessage({ id: crypto.randomUUID(), role: 'user', text })
    setInput('')
    startSending()
    setStreamBuffer('')
    if (!portRef.current) {
      portRef.current = chrome.runtime.connect({ name: 'chat' })
    }
    portRef.current.postMessage({ type: 'chat', text })
  }

  if (!isOpen) return null
  return container
}


