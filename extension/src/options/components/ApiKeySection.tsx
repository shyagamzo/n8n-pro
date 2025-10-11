import React, { useEffect, useState } from 'react'
import Button from '../../lib/components/Button'
import { getOpenAiKey, setOpenAiKey, clearOpenAiKey, getN8nApiKey, setN8nApiKey, clearN8nApiKey, getBaseUrl, setBaseUrl, clearBaseUrl } from '../../lib/services/settings'
import '../../lib/styles/utilities.css'
import '../Options.css'

function maskKey(key: string): string
{
  if (!key) return ''
  const head = key.slice(0, 4)
  const tail = key.slice(-4)
  return `${head}${'*'.repeat(Math.max(0, key.length - 8))}${tail}`
}

function getStatusIcon(type: 'success' | 'error' | 'warning'): string
{
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '⚠'
    default: return 'ℹ'
  }
}

export default function ApiKeySection(): React.ReactElement
{
  const [keyMasked, setKeyMasked] = useState('')
  const [keyInput,  setKeyInput]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [message,   setMessage]   = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success')

  const [n8nKeyMasked, setN8nKeyMasked] = useState('')
  const [n8nKeyInput,  setN8nKeyInput]  = useState('')
  const [baseUrl, setBaseUrlInput] = useState('')

  useEffect(() =>
  {
    void getOpenAiKey().then((raw) => setKeyMasked(maskKey(raw)))
    void getN8nApiKey().then((raw) => setN8nKeyMasked(maskKey(raw)))
    void getBaseUrl().then((raw) => setBaseUrlInput(raw || 'http://localhost:5678'))
  }, [])

  function showMessage(text: string, type: 'success' | 'error' | 'warning' = 'success'): void
  {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  async function save(): Promise<void>
  {
    const next = keyInput.trim()

    if (!next)
    {
      showMessage('Please enter a valid OpenAI API key', 'error')
      return
    }

    setSaving(true)
    try {
      await setOpenAiKey(next)
      setKeyMasked(maskKey(next))
      setKeyInput('')
      showMessage('OpenAI API key saved successfully!', 'success')
    } catch (error) {
      showMessage('Failed to save OpenAI API key', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function clear(): Promise<void>
  {
    setSaving(true)
    try {
      await clearOpenAiKey()
      setKeyMasked('')
      showMessage('OpenAI API key cleared', 'success')
    } catch (error) {
      showMessage('Failed to clear OpenAI API key', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveN8n(): Promise<void>
  {
    const next = n8nKeyInput.trim()

    if (!next)
    {
      showMessage('Please enter a valid n8n API key', 'error')
      return
    }

    setSaving(true)
    try {
      await setN8nApiKey(next)
      setN8nKeyMasked(maskKey(next))
      setN8nKeyInput('')
      showMessage('n8n API key saved successfully!', 'success')
    } catch (error) {
      showMessage('Failed to save n8n API key', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function clearN8n(): Promise<void>
  {
    setSaving(true)
    try {
      await clearN8nApiKey()
      setN8nKeyMasked('')
      showMessage('n8n API key cleared', 'success')
    } catch (error) {
      showMessage('Failed to clear n8n API key', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveBase(): Promise<void>
  {
    const url = baseUrl.trim()

    if (!url)
    {
      showMessage('Please enter a valid Base URL', 'error')
      return
    }

    setSaving(true)
    try {
      await setBaseUrl(url)
      showMessage('Base URL saved successfully!', 'success')
    } catch (error) {
      showMessage('Failed to save Base URL', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function clearBase(): Promise<void>
  {
    setSaving(true)
    try {
      await clearBaseUrl()
      setBaseUrlInput('')
      showMessage('Base URL cleared', 'success')
    } catch (error) {
      showMessage('Failed to clear Base URL', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* OpenAI API Key Card */}
      <div className="options-card">
        <div className="card-header">
          <div className="card-icon">🤖</div>
          <div>
            <h2 className="card-title">OpenAI API Key</h2>
            <p className="card-description">
              Required for AI-powered workflow generation. Your key is stored securely in browser storage.
            </p>
          </div>
        </div>

        <div className="form-section">
          <div className="form-row">
            <div className="form-input-wrapper">
              <label className="form-label-text">Current Key (masked)</label>
              <input 
                className="form-input" 
                value={keyMasked || 'No key set'} 
                readOnly 
                placeholder="sk-..."
              />
            </div>
            <div className="form-actions">
              <Button 
                variant="secondary" 
                onClick={() => void clear()} 
                disabled={saving || !keyMasked}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-input-wrapper">
              <label className="form-label-text">New API Key</label>
              <input 
                className="form-input" 
                placeholder="sk-..." 
                value={keyInput} 
                onChange={(e) => setKeyInput(e.currentTarget.value)}
                disabled={saving}
              />
            </div>
            <div className="form-actions">
              <Button 
                onClick={() => void save()} 
                disabled={saving || !keyInput.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* n8n API Key Card */}
      <div className="options-card">
        <div className="card-header">
          <div className="card-icon">⚡</div>
          <div>
            <h2 className="card-title">n8n API Key</h2>
            <p className="card-description">
              Required for creating and managing workflows in your n8n instance.
            </p>
          </div>
        </div>

        <div className="form-section">
          <div className="form-row">
            <div className="form-input-wrapper">
              <label className="form-label-text">Current Key (masked)</label>
              <input 
                className="form-input" 
                value={n8nKeyMasked || 'No key set'} 
                readOnly 
                placeholder="n8n API Key"
              />
            </div>
            <div className="form-actions">
              <Button 
                variant="secondary" 
                onClick={() => void clearN8n()} 
                disabled={saving || !n8nKeyMasked}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-input-wrapper">
              <label className="form-label-text">New API Key</label>
              <input 
                className="form-input" 
                placeholder="n8n API Key" 
                value={n8nKeyInput} 
                onChange={(e) => setN8nKeyInput(e.currentTarget.value)}
                disabled={saving}
              />
            </div>
            <div className="form-actions">
              <Button 
                onClick={() => void saveN8n()} 
                disabled={saving || !n8nKeyInput.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* n8n Base URL Card */}
      <div className="options-card">
        <div className="card-header">
          <div className="card-icon">🌐</div>
          <div>
            <h2 className="card-title">n8n Base URL</h2>
            <p className="card-description">
              The URL where your n8n instance is running. Default is localhost:5678.
            </p>
          </div>
        </div>

        <div className="form-section">
          <div className="form-row">
            <div className="form-input-wrapper">
              <label className="form-label-text">Base URL</label>
              <input 
                className="form-input" 
                placeholder="http://localhost:5678" 
                value={baseUrl} 
                onChange={(e) => setBaseUrlInput(e.currentTarget.value)}
                disabled={saving}
              />
            </div>
            <div className="form-actions">
              <Button 
                variant="secondary" 
                onClick={() => void clearBase()} 
                disabled={saving || !baseUrl}
              >
                Clear
              </Button>
              <Button 
                onClick={() => void saveBase()} 
                disabled={saving || !baseUrl.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`status-message status-message--${messageType}`}>
          <span className="status-icon">{getStatusIcon(messageType)}</span>
          {message}
        </div>
      )}
    </>
  )
}


