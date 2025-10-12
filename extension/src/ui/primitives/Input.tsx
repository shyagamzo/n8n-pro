import React from 'react'
import './FormElements.css'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({ label, ...props }: InputProps): React.ReactElement
{
  return (
    <label className="form-label">
      {label && <span className="form-label-text">{label}</span>}
      <input
        {...props}
        className="form-input"
      />
    </label>
  )
}
