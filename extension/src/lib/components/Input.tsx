import React from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({ label, ...props }: InputProps): React.ReactElement {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
      {label && <span style={{ color: 'var(--color-text, #111827)' }}>{label}</span>}
      <input
        {...props}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--color-border, #e5e7eb)',
          outline: 'none',
          fontSize: 14
        }}
      />
    </label>
  )
}


