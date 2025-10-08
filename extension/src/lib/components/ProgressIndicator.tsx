import React from 'react'
import './ProgressIndicator.css'

type ProgressIndicatorProps = {
  status: string
  step: number
  total: number
}

export default function ProgressIndicator({ status, step, total }: ProgressIndicatorProps): React.ReactElement
{
  const percentage = (step / total) * 100

  return (
    <div className="progress-indicator">
      <div className="progress-indicator__content">
        <div className="progress-indicator__icon">⏳</div>
        <div className="progress-indicator__text">
          <div className="progress-indicator__status">{status}</div>
          <div className="progress-indicator__step">Step {step} of {total}</div>
        </div>
      </div>
      <div className="progress-indicator__bar">
        <div 
          className="progress-indicator__fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

