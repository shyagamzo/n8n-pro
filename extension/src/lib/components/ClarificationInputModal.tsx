import React, { useState, useRef, useEffect } from 'react'
import './ClarificationInputModal.css'

type ClarificationInputModalProps = {
  isOpen: boolean
  question: string
  onSubmit: (answer: string) => void
  onCancel: () => void
}

export default function ClarificationInputModal({
  isOpen,
  question,
  onSubmit,
  onCancel
}: ClarificationInputModalProps): React.ReactElement | null
{
  const [answer, setAnswer] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  // Reset answer when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAnswer('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedAnswer = answer.trim()
    if (trimmedAnswer) {
      onSubmit(trimmedAnswer)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      const trimmedAnswer = answer.trim()
      if (trimmedAnswer) {
        onSubmit(trimmedAnswer)
      }
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div className="clarification-modal-overlay" onClick={onCancel}>
      <div className="clarification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="clarification-modal-header">
          <h3 className="clarification-modal-title">💭 Need More Information</h3>
        </div>
        <div className="clarification-modal-body">
          <p className="clarification-modal-question">{question}</p>
          <form onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer here... (Ctrl+Enter to submit)"
              className="clarification-modal-input"
              rows={3}
              autoFocus
            />
          </form>
        </div>
        <div className="clarification-modal-footer">
          <button 
            className="clarification-modal-btn clarification-modal-btn--cancel" 
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="clarification-modal-btn clarification-modal-btn--submit" 
            onClick={() => onSubmit(answer.trim())}
            disabled={!answer.trim()}
          >
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  )
}
