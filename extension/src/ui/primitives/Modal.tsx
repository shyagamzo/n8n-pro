import React, { useEffect, useRef } from 'react'
import './Modal.css'

type ConfirmModalProps = {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmModalProps): React.ReactElement | null
{
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Focus management and cleanup
  useEffect(() =>
  {
    if (isOpen)
    {
      // Store element that had focus before modal opened
      previousActiveElement.current = document.activeElement as HTMLElement

      // Auto-focus first button after a brief delay (for screen reader announcement)
      const timer = setTimeout(() =>
      {
        cancelButtonRef.current?.focus()
      }, 100)

      return () =>
      {
        clearTimeout(timer)

        // Restore focus to element that had focus before modal
        if (previousActiveElement.current)
        {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [isOpen])

  // Keyboard handling: Escape key and focus trap
  useEffect(() =>
  {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void =>
    {
      // Close modal on Escape
      if (e.key === 'Escape')
      {
        e.preventDefault()
        onCancel()
        return
      }

      // Focus trap: Tab/Shift+Tab handling
      if (e.key === 'Tab')
      {
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )

        if (!focusableElements || focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement)
        {
          e.preventDefault()
          lastElement.focus()
        }
        else if (!e.shiftKey && document.activeElement === lastElement)
        {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () =>
    {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="confirm-modal-overlay" onClick={onCancel} role="presentation">
      <div
        ref={dialogRef}
        className="confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
      >
        <div className="confirm-modal-header">
          <h3 id="modal-title" className="confirm-modal-title">
            {title}
          </h3>
        </div>
        <div className="confirm-modal-body">
          <p id="modal-message" className="confirm-modal-message">
            {message}
          </p>
        </div>
        <div className="confirm-modal-footer">
          <button
            ref={cancelButtonRef}
            className="confirm-modal-btn confirm-modal-btn--cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button className="confirm-modal-btn confirm-modal-btn--confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

