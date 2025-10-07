import React, { useCallback, useState } from 'react'
import Input from '../../lib/components/Input'
import Button from '../../lib/components/Button'
import { composerRow, inputFlex } from '../styles'

type ChatComposerProps = {
  sending: boolean
  onSend: (text: string) => void
}

export default function ChatComposer({ sending, onSend }: ChatComposerProps): React.ReactElement
{
  const [input, setInput] = useState('')

  const handleSubmit = useCallback((e: React.FormEvent) =>
  {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    onSend(text)
  }, [input, onSend])

  return (
    <form onSubmit={handleSubmit} style={composerRow}>
      <div style={inputFlex}>
        <Input value={input} onChange={(e) => setInput(e.currentTarget.value)} placeholder="Ask me to create or improve a workflow…" />
      </div>
      <Button type="submit" disabled={!input || sending}>Send</Button>
    </form>
  )
}


