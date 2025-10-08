import React, { useState } from 'react'
import type { Plan } from '../../lib/types/plan'
import { chat } from '../../lib/services/chat'
import DebugPanel from './DebugPanel'
import '../../lib/styles/utilities.css'
import './PlanMessage.css'

type PlanMessageProps = {
  plan: Plan
}

export default function PlanMessage({ plan }: PlanMessageProps): React.ReactElement
{
  const [showCredDetails, setShowCredDetails] = useState(false)

  const hasNeededCredentials = Array.isArray(plan.credentialsNeeded) && plan.credentialsNeeded.length > 0
  const hasAvailableCredentials = Array.isArray(plan.credentialsAvailable) && plan.credentialsAvailable.length > 0
  const hasAnyCredentials = hasNeededCredentials || hasAvailableCredentials

  return (
    <div className="plan-message-container container-card mt-xs">
      <div className="plan-message-title text-bold text-sm text-primary">{plan.title}</div>
      <div className="plan-message-summary text-secondary text-xs mb-sm">{plan.summary}</div>

      {hasAnyCredentials && (
        <div className="plan-message-credentials mb-sm">
          {hasNeededCredentials && (
            <div className="plan-message-warning alert-warning mb-xs">
              <span className="plan-message-warning-icon">⚠️</span>
              <strong>Setup Required</strong><br />
              {plan.credentialsNeeded?.length} credential{plan.credentialsNeeded?.length !== 1 ? 's' : ''} will need setup after creation.
            </div>
          )}

          {showCredDetails && (
            <div className="plan-message-cred-details container-elevated mt-xs">
              {hasAvailableCredentials && plan.credentialsAvailable && (
                <div>
                  <strong>Available Credentials:</strong>
                  {plan.credentialsAvailable.map((cred, idx) => (
                    <div key={idx} className="plan-message-cred-item">
                      <strong>{cred.type}</strong>
                      {cred.name && <span> - {cred.name}</span>}
                      {cred.requiredFor && <span> (for {cred.requiredFor})</span>}
                    </div>
                  ))}
                </div>
              )}

              {hasNeededCredentials && plan.credentialsNeeded && (
                <div>
                  <strong>Credentials Needed:</strong>
                  {plan.credentialsNeeded.map((cred, idx) => (
                    <div key={idx} className="plan-message-cred-item">
                      <strong>{cred.type}</strong>
                      {cred.name && <span> - {cred.name}</span>}
                      {cred.requiredFor && <span> (for {cred.requiredFor})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowCredDetails(!showCredDetails)}
            className="plan-message-toggle btn-icon"
          >
            {showCredDetails ? '▼ Hide credential details' : '▶ Show credential details'}
          </button>
        </div>
      )}

      <div className="plan-message-actions flex gap-sm mt-sm">
        <button onClick={() => chat.applyPlan(plan)} className="plan-message-apply-button btn btn-small">
          {hasNeededCredentials ? 'Create & Open in n8n' : 'Create Workflow'}
        </button>
      </div>

      {hasNeededCredentials && (
        <div className="plan-message-info text-xs text-secondary mt-xs">
          After creation, you'll get a direct link to open the workflow and configure credentials.
        </div>
      )}

      <DebugPanel plan={plan} />
    </div>
  )
}
