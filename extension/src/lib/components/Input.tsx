import React from 'react'
import { componentTokens, colors, spacing, typography } from '../styles/tokens'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({ label, ...props }: InputProps): React.ReactElement
{
  return (
    <label style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing['4xs'],
      fontSize: typography.fontSizeS
    }}>
      {label && <span style={{ color: colors.text }}>{label}</span>}
      <input
        {...props}
        style={{
          ...componentTokens.input,
          outline: 'none',
          ...props.style,
        }}
      />
    </label>
  )
}
