import React from 'react'

type ButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  className?: string
}

export default function Button({
  children,
  onClick,
  type = 'button',
  disabled,
  variant = 'primary',
  className
}: ButtonProps): React.ReactElement
{
  const base = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1.2,
    background: 'var(--color-primary, #4f46e5)',
    color: 'var(--color-on-primary, #fff)'
  } as React.CSSProperties

  const secondary = {
    background: 'var(--color-surface, #f3f4f6)',
    color: 'var(--color-text, #111827)',
    borderColor: 'var(--color-border, #e5e7eb)'
  } as React.CSSProperties

  const style = variant === 'secondary' ? { ...base, ...secondary } : base

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={style} className={className}>
      {children}
    </button>
  )
}
