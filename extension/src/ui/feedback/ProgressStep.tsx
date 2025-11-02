/**
 * Progress Step Component
 *
 * Individual step in the workflow progress stepper.
 * Shows step indicator, connecting line, and label.
 */

import React from 'react'
import type { WorkflowState } from '@shared/types/workflow-state'

export interface ProgressStepProps
{
  state: WorkflowState
  label: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  stepNumber: number
  isLast?: boolean
}

export function ProgressStep({
  label,
  status,
  stepNumber,
  isLast = false
}: ProgressStepProps): React.ReactElement
{
  const icons: Record<string, React.ReactNode> = {
    pending: stepNumber,
    active: stepNumber,
    completed: '✓',
    failed: '✕'
  }

  return (
    <div className={`progress-step progress-step--${status}`} role="listitem">
      {/* Step indicator with full accessibility */}
      <div
        className="progress-step__indicator"
        role="img"
        aria-label={`Step ${stepNumber}: ${label}, ${status === 'active' ? 'in progress' : status}`}
      >
        <div className="progress-step__icon" aria-hidden="true">
          {icons[status]}
        </div>
      </div>

      {/* Connecting line */}
      {!isLast && (
        <div className="progress-step__line" aria-hidden="true" />
      )}

      {/* Visual label (hidden from screen readers since indicator has full label) */}
      <div className="progress-step__label" aria-hidden="true">
        <span className="progress-step__text">{label}</span>
      </div>
    </div>
  )
}
