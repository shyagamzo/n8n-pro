import React, { useEffect, useState } from 'react'
import Input from '../../lib/components/Input'
import Button from '../../lib/components/Button'
import { getOpenAiKey, setOpenAiKey, clearOpenAiKey, getN8nApiKey, setN8nApiKey, clearN8nApiKey } from '../../lib/services/settings'

function maskKey(key: string): string
{
  if (!key) return ''
  const head = key.slice(0, 4)
  const tail = key.slice(-4)
  return `${head}${'*'.repeat(Math.max(0, key.length - 8))}${tail}`
}

export default function ApiKeySection(): React.ReactElement
{
  const [keyMasked, setKeyMasked] = useState('')
  const [keyInput,  setKeyInput]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [message,   setMessage]   = useState('')

  const [n8nKeyMasked, setN8nKeyMasked] = useState('')
  const [n8nKeyInput,  setN8nKeyInput]  = useState('')

  useEffect(() =>
  {
    void getOpenAiKey().then((raw) => setKeyMasked(maskKey(raw)))
    void getN8nApiKey().then((raw) => setN8nKeyMasked(maskKey(raw)))
  }, [])

  async function save(): Promise<void>
  {
    const next = keyInput.trim()

    if (!next)
    {
      setMessage('Enter a valid key')
      return
    }

    setSaving(true)
    await setOpenAiKey(next)
    setKeyMasked(maskKey(next))
    setKeyInput('')
    setSaving(false)
    setMessage('Saved')
    setTimeout(() => setMessage(''), 1500)
  }

  async function clear(): Promise<void>
  {
    setSaving(true)
    await clearOpenAiKey()
    setKeyMasked('')
    setSaving(false)
  }

  async function saveN8n(): Promise<void>
  {
    const next = n8nKeyInput.trim()
    if (!next)
    {
      setMessage('Enter a valid n8n API key')
      return
    }
    setSaving(true)
    await setN8nApiKey(next)
    setN8nKeyMasked(maskKey(next))
    setN8nKeyInput('')
    setSaving(false)
    setMessage('n8n key saved')
    setTimeout(() => setMessage(''), 1500)
  }

  async function clearN8n(): Promise<void>
  {
    setSaving(true)
    await clearN8nApiKey()
    setN8nKeyMasked('')
    setSaving(false)
  }

  return (
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

      <h3 style={{ marginTop: 24 }}>n8n API Key</h3>
      <p style={{ color: '#4b5563' }}>Stored securely and used only by the background worker for n8n REST API.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <Input label="Current (masked)" value={n8nKeyMasked} readOnly />
        </div>
        <Button variant="secondary" onClick={() => void clearN8n()} disabled={saving || !n8nKeyMasked}>Clear</Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Input label="New key" placeholder="n8n API Key" value={n8nKeyInput} onChange={(e) => setN8nKeyInput(e.currentTarget.value)} />
        </div>
        <Button onClick={() => void saveN8n()} disabled={saving || !n8nKeyInput.trim()}>Save</Button>
      </div>
    </section>
  )
}


