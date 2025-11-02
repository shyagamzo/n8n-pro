import React from 'react'
import './FormElements.css'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({ label, ...props }: InputProps): React.ReactElement
{
  // Generate stable ID for accessibility
  const inputId = props.id || `input-${React.useId()}`

  return (
    <label className="form-label" htmlFor={inputId}>
      {label && <span className="form-label-text">{label}</span>}
      <input
        {...props}
        id={inputId}
        className="form-input"
        aria-label={!label ? (props.placeholder || 'Input field') : undefined}
      />
    </label>
  )
}
