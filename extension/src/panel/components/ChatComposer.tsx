import React, { useCallback, useState, useRef } from 'react'
import Textarea from '../../lib/components/Textarea'
import Button from '../../lib/components/Button'
import { composerRow, inputFlex } from '../styles'

type ChatComposerProps = {
  sending: boolean
  onSend: (text: string) => void
}

export default function ChatComposer({ sending, onSend }: ChatComposerProps): React.ReactElement
{
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback((e: React.FormEvent) =>
  {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    onSend(text)
  }, [input, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) =>
  {
    // Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
    {
      e.preventDefault()
      const text = input.trim()
      if (!text) return
      setInput('')
      onSend(text)
    }
    // Enter alone creates new line (default behavior)
  }, [input, onSend])

  return (
    <form onSubmit={handleSubmit} style={composerRow}>
      <div style={inputFlex}>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me to create or improve a workflow… (Ctrl+Enter to send)"
          minRows={1}
          maxRows={6}
          style={{ width: '100%' }}
        />
      </div>
      <Button type="submit" disabled={!input.trim() || sending}>
        Send
      </Button>
    </form>
  )
}


