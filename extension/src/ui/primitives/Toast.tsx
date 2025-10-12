import React, { useEffect } from 'react'
import './Toast.css'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type ToastProps = {
  id: string
  message: string
  type: ToastType
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  onClose: (id: string) => void
}

export default function Toast({ id, message, type, action, duration = 5000, onClose }: ToastProps): React.ReactElement
{
  useEffect(() =>
  {
    if (duration > 0)
    {
      const timer = setTimeout(() => onClose(id), duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [id, duration, onClose])

  const getIcon = (): string =>
  {
    switch (type)
    {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
    }
  }

  return (
    <div className={`toast toast--${type}`}>
      <div className="toast__content">
        <span className="toast__icon">{getIcon()}</span>
        <span className="toast__message">{message}</span>
      </div>
      <div className="toast__actions">
        {action && (
          <button className="toast__action-button" onClick={action.onClick}>
            {action.label}
          </button>
        )}
        <button className="toast__close" onClick={() => onClose(id)} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  )
}

