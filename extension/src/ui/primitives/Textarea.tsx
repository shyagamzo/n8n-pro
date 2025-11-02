import React, { useRef, useEffect, forwardRef, useCallback } from 'react'
import './FormElements.css'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  autoResize?: boolean
  minRows?: number
  maxRows?: number
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  autoResize = true,
  minRows = 1,
  maxRows = 10,
  ...props
}, ref): React.ReactElement =>
{
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

  // Generate stable ID for accessibility
  const textareaId = props.id || `textarea-${React.useId()}`

  const adjustHeight = useCallback(() =>
{
    const textarea = textareaRef.current
    if (!textarea || !autoResize) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'

    // Calculate the height based on content
    const scrollHeight = textarea.scrollHeight
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
    const minHeight = lineHeight * minRows
    const maxHeight = lineHeight * maxRows

    // Set height within bounds
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [autoResize, minRows, maxRows])

  // Adjust height on mount and when value changes
  useEffect(() =>
{
    adjustHeight()
  }, [adjustHeight, props.value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
{
    adjustHeight()
    props.onChange?.(e)
  }

  return (
    <label className="form-label" htmlFor={textareaId}>
      {label && <span className="form-label-text">{label}</span>}
      <textarea
        ref={textareaRef}
        {...props}
        id={textareaId}
        onChange={handleChange}
        className="form-textarea"
        aria-label={!label ? (props.placeholder || 'Text input field') : undefined}
        style={{
          minHeight: `${(parseInt(getComputedStyle(document.body).lineHeight) || 20) * minRows}px`,
          ...props.style
        }}
      />
    </label>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
