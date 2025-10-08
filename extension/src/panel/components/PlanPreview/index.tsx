import React, { useState } from 'react'
import type { Plan } from '../../../lib/types/plan'
import { chat } from '../../../lib/services/chat'
import AvailableCredentials from './AvailableCredentials'
import NeededCredentials from './NeededCredentials'
import { styles } from './styles'

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
    <div style={styles.container}>
      <div style={styles.title}>{plan.title}</div>
      <div style={styles.summary}>{plan.summary}</div>

      {hasAnyCredentials && (
        <div style={styles.credentialsContainer}>
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
            style={styles.toggleButton}
          >
            {showCredDetails ? '▼ Hide credential details' : '▶ Show credential details'}
          </button>
        </div>
      )}

      <div style={styles.actions}>
        <button onClick={() => chat.applyPlan(plan)} style={styles.applyButton}>
          Apply Workflow
        </button>
        <button onClick={onCancel} style={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </div>
  )
}

