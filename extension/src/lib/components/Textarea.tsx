import React, { useRef, useEffect, forwardRef } from 'react'

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

  const adjustHeight = () => {
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
  }

  // Adjust height on mount and when value changes
  useEffect(() => {
    adjustHeight()
  }, [props.value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight()
    props.onChange?.(e)
  }

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
      {label && <span style={{ color: 'var(--color-text, #111827)' }}>{label}</span>}
      <textarea
        ref={textareaRef}
        {...props}
        onChange={handleChange}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--color-border, #e5e7eb)',
          outline: 'none',
          fontSize: 14,
          fontFamily: 'inherit',
          resize: 'none',
          overflow: 'hidden',
          minHeight: `${(parseInt(getComputedStyle(document.body).lineHeight) || 20) * minRows}px`,
          ...props.style
        }}
      />
    </label>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
