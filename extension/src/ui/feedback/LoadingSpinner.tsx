/**
 * Loading Spinner Component
 *
 * Reusable spinner with 3 sizes (sm/md/lg) and hardware-accelerated animations.
 * Supports inline display and respects prefers-reduced-motion.
 */

import React from 'react'
import './LoadingSpinner.css'

export interface LoadingSpinnerProps
{
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg'
  /** Show inline with text */
  inline?: boolean
  /** Accessible label */
  label?: string
  /** Custom color (defaults to primary) */
  color?: string
}

export function LoadingSpinner({
  size = 'md',
  inline = false,
  label = 'Loading',
  color
}: LoadingSpinnerProps): React.ReactElement
{
  return (
    <div
      className={`loading-spinner loading-spinner--${size} ${inline ? 'loading-spinner--inline' : ''}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className="loading-spinner__svg"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="60 40"
          opacity="0.25"
        />
        {/* Animated circle */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color || 'currentColor'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="60 40"
          className="loading-spinner__circle"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}
