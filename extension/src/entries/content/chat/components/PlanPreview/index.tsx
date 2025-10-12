import React, { useState } from 'react'
import type { Plan } from '@shared/types/plan'
import { chat } from '@services/chat'
import AvailableCredentials from './AvailableCredentials'
import NeededCredentials from './NeededCredentials'
import '@ui/utilities.css'
import './styles.css'

type PlanPreviewProps = {
  plan: Plan
  onCancel: () => void
}

export default function PlanPreview({ plan, onCancel }: PlanPreviewProps): React.ReactElement
{
  const [showCredDetails, setShowCredDetails] = useState(false)

  const hasNeededCredentials = Array.isArray(plan.credentialsNeeded) && plan.credentialsNeeded.length > 0
  const hasAvailableCredentials = Array.isArray(plan.credentialsAvailable) && plan.credentialsAvailable.length > 0
  const hasAnyCredentials = hasNeededCredentials || hasAvailableCredentials

  return (
    <div className="plan-preview-container container-card mt-xs">
      <div className="plan-preview-title text-bold text-sm">{plan.title}</div>
      <div className="plan-preview-summary text-secondary text-xs mb-sm">{plan.summary}</div>

      {hasAnyCredentials && (
        <div className="plan-preview-credentials mb-sm">
          {hasAvailableCredentials && plan.credentialsAvailable && (
            <AvailableCredentials
              credentials={plan.credentialsAvailable}
              showDetails={showCredDetails}
              hasNeededCredentials={hasNeededCredentials}
            />
          )}

          {hasNeededCredentials && (
            <NeededCredentials
              credentials={plan.credentialsNeeded}
              showDetails={showCredDetails}
            />
          )}

          <button
            onClick={() => setShowCredDetails(!showCredDetails)}
            className="plan-preview-toggle btn-icon"
          >
            {showCredDetails ? '▼ Hide credential details' : '▶ Show credential details'}
          </button>
        </div>
      )}

      <div className="plan-preview-actions flex gap-sm">
        <button onClick={() => chat.applyPlan(plan)} className="plan-preview-apply btn btn-small">
          {hasNeededCredentials ? 'Create & Open in n8n' : 'Create Workflow'}
        </button>
        <button onClick={onCancel} className="plan-preview-cancel btn btn-small">
          Cancel
        </button>
      </div>

      {hasNeededCredentials && (
        <div className="plan-preview-helper-text text-xs text-secondary mt-xs">
          💡 After creation, you'll get a direct link to open the workflow and configure credentials.
        </div>
      )}
    </div>
  )
}

