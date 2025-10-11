import React from 'react'
import ApiKeySection from './components/ApiKeySection'
import ErrorBoundary from '../lib/components/ErrorBoundary'
import './Options.css'

export default function Options(): React.ReactElement
{
  return (
    <ErrorBoundary>
      <div className="options-container">
        <div className="options-header">
          <h1 className="options-title">n8n Pro Settings</h1>
          <p className="options-subtitle">
            Configure your API keys and connection settings to get started with n8n Pro
          </p>
        </div>
        <div className="options-content">
          <ApiKeySection />
        </div>
      </div>
    </ErrorBoundary>
  )
}





