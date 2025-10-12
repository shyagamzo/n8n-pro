import React from 'react'
import './EmptyState.css'

type EmptyStateProps = {
  onExampleClick: (prompt: string) => void
}

const EXAMPLE_PROMPTS = [
  'Create a workflow that sends Slack messages when GitHub issues are created',
  'Build a workflow to sync Google Calendar events with Notion',
  'Make a workflow that monitors RSS feeds and posts to Twitter',
  'Create a workflow to backup database and email the results',
]

export default function EmptyState({ onExampleClick }: EmptyStateProps): React.ReactElement
{
  return (
    <div className="empty-state">
      <div className="empty-state__icon">🤖</div>
      <h2 className="empty-state__title">Welcome to n8n Assistant!</h2>
      <p className="empty-state__description">
        I can help you create, optimize, and manage n8n workflows using natural language.
      </p>
      
      <div className="empty-state__examples">
        <h3 className="empty-state__examples-title">Try asking:</h3>
        <div className="empty-state__examples-list">
          {EXAMPLE_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              className="empty-state__example-button"
              onClick={() => onExampleClick(prompt)}
            >
              <span className="empty-state__example-icon">💡</span>
              <span className="empty-state__example-text">{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="empty-state__features">
        <div className="empty-state__feature">
          <span className="empty-state__feature-icon">✨</span>
          <span className="empty-state__feature-text">AI-powered workflow creation</span>
        </div>
        <div className="empty-state__feature">
          <span className="empty-state__feature-icon">🔐</span>
          <span className="empty-state__feature-text">Smart credential guidance</span>
        </div>
        <div className="empty-state__feature">
          <span className="empty-state__feature-icon">⚡</span>
          <span className="empty-state__feature-text">One-click workflow deployment</span>
        </div>
      </div>
    </div>
  )
}

