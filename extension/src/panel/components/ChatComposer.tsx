import React, { useCallback, useState } from 'react'
import Input from '../../lib/components/Input'
import Button from '../../lib/components/Button'

type ChatComposerProps = {
  sending: boolean
  onSend: (text: string) => void
}

export default function ChatComposer({ sending, onSend }: ChatComposerProps): React.ReactElement {
  const [input, setInput] = useState('')

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    onSend(text)
  }, [input, onSend])

  return (
    <form onSubmit={handleSubmit} style={{ padding: 12, borderTop: '1px solid var(--color-border, #e5e7eb)', display: 'flex', gap: 8 }}>
      <div style={{ flex: 1 }}>
        <Input value={input} onChange={(e) => setInput(e.currentTarget.value)} placeholder="Ask me to create or improve a workflow…" />
      </div>
      <Button type="submit" disabled={!input || sending}>Send</Button>
    </form>
  )
}


