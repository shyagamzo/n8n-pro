import React from 'react'
import './Button.css'

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
  const buttonClass = `button button--${variant} ${className || ''}`.trim()

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={buttonClass}>
      {children}
    </button>
  )
}
