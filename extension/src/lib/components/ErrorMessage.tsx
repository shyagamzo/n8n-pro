import React from 'react'
import './ErrorMessage.css'

export type ErrorMessageProps = {
  title?: string
  message: string
  details?: string
  onRetry?: () => void
  onDismiss?: () => void
  severity?: 'error' | 'warning' | 'info'
}

/**
 * User-friendly error message component for displaying errors
 * throughout the extension with clear, actionable information.
 */
export default function ErrorMessage({
  title,
  message,
  details,
  onRetry,
  onDismiss,
  severity = 'error'
}: ErrorMessageProps): React.ReactElement
{
  const getIcon = (): string =>
  {
    switch (severity)
    {
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      case 'error':
      default: return '❌'
    }
  }

  return (
    <div className={`error-message error-message--${severity}`}>
      <div className="error-message__header">
        <span className="error-message__icon">{getIcon()}</span>
        <h3 className="error-message__title">
          {title || (severity === 'warning' ? 'Warning' : severity === 'info' ? 'Information' : 'Error')}
        </h3>
        {onDismiss && (
          <button
            className="error-message__close"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
      <p className="error-message__message">{message}</p>
      {details && (
        <details className="error-message__details">
          <summary>More details</summary>
          <p className="error-message__details-content">{details}</p>
        </details>
      )}
      {onRetry && (
        <div className="error-message__actions">
          <button
            className="error-message__button error-message__button--retry"
            onClick={onRetry}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

