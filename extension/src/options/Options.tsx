import React, { useEffect, useState } from 'react'
import Input from '../lib/components/Input'
import Button from '../lib/components/Button'

export default function Options(): React.ReactElement {
  const [keyMasked, setKeyMasked] = useState<string>('')
  const [keyInput, setKeyInput] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')

  function maskKey(key: string): string {
    if (!key) return ''
    const head = key.slice(0, 4)
    const tail = key.slice(-4)
    return `${head}${'*'.repeat(Math.max(0, key.length - 8))}${tail}`
  }

  useEffect(() => {
    chrome.storage.local.get(['openai_api_key'], (res) => {
      const raw = (res?.openai_api_key as string | undefined) ?? ''
      setKeyMasked(maskKey(raw))
    })
  }, [])

  async function save(): Promise<void> {
    if (!keyInput.trim()) {
      setMessage('Enter a valid key')
      return
    }

    setSaving(true)
    await new Promise<void>((resolve) => chrome.storage.local.set({ openai_api_key: keyInput.trim() }, () => resolve()))
    setKeyMasked(maskKey(keyInput.trim()))
    setKeyInput('')
    setSaving(false)
    setMessage('Saved')
    setTimeout(() => setMessage(''), 1500)
  }

  async function clear(): Promise<void> {
    setSaving(true)
    await new Promise<void>((resolve) => chrome.storage.local.remove(['openai_api_key'], () => resolve()))
    setKeyMasked('')
    setSaving(false)
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial', padding: 12, maxWidth: 560 }}>
      <h1>n8n Pro Options</h1>
      <section style={{ marginTop: 16 }}>
        <h3>OpenAI API Key</h3>
        <p style={{ color: '#4b5563' }}>Stored securely in chrome.storage.local and used only by the background worker.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <Input label="Current (masked)" value={keyMasked} readOnly />
          </div>
          <Button variant="secondary" onClick={() => void clear()} disabled={saving || !keyMasked}>Clear</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <Input label="New key" placeholder="sk-..." value={keyInput} onChange={(e) => setKeyInput(e.currentTarget.value)} />
          </div>
          <Button onClick={() => void save()} disabled={saving || !keyInput.trim()}>Save</Button>
        </div>
        {message && <div style={{ marginTop: 8, color: '#065f46' }}>{message}</div>}
      </section>
    </div>
  )
}





