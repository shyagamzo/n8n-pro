import React, { useEffect, useState } from 'react'
import { getOpenAiKey, getN8nApiKey } from '../services/settings'
import './ConnectionStatus.css'

type ConnectionState = 'connected' | 'partial' | 'disconnected' | 'loading'

export default function ConnectionStatus(): React.ReactElement
{
  const [status, setStatus] = useState<ConnectionState>('loading')
  const [missingKeys, setMissingKeys] = useState<string[]>([])

  const checkConnection = React.useCallback(async (): Promise<void> =>
  {
    const [openAiKey, n8nKey] = await Promise.all([
      getOpenAiKey(),
      getN8nApiKey()
    ])

    const missing: string[] = []
    if (!openAiKey) missing.push('OpenAI')
    if (!n8nKey) missing.push('n8n')

    setMissingKeys(missing)

    if (missing.length === 0)
    {
      setStatus('connected')
    }
    else if (missing.length === 2)
    {
      setStatus('disconnected')
    }
    else
    {
      setStatus('partial')
    }
  }, [])

  useEffect(() =>
  {
    void checkConnection()
  }, [checkConnection])

  function getIcon(): string
  {
    switch (status)
    {
      case 'connected': return '✅'
      case 'partial': return '⚠️'
      case 'disconnected': return '❌'
      case 'loading': return '⏳'
    }
  }

  function getLabel(): string
  {
    switch (status)
    {
      case 'connected': return 'Connected'
      case 'partial': return 'Setup Required'
      case 'disconnected': return 'Not Configured'
      case 'loading': return 'Checking...'
    }
  }

  function getTooltip(): string
  {
    switch (status)
    {
      case 'connected': return 'All API keys configured'
      case 'partial': return `Missing: ${missingKeys.join(', ')} API key${missingKeys.length > 1 ? 's' : ''}`
      case 'disconnected': return 'Click to configure API keys'
      case 'loading': return 'Checking connection status...'
    }
  }

  function handleClick(): void
  {
    if (status !== 'connected')
    {
      // Open options page
      chrome.runtime.openOptionsPage()
    }
  }

  return (
    <button
      className={`connection-status connection-status--${status}`}
      onClick={handleClick}
      title={getTooltip()}
      disabled={status === 'loading'}
    >
      <span className="connection-status__icon">{getIcon()}</span>
      <span className="connection-status__label">{getLabel()}</span>
    </button>
  )
}

