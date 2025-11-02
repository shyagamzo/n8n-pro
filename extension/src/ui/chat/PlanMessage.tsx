import React, { useState, useRef, useEffect } from 'react'
import type { Plan } from '@shared/types/plan'
import { chat } from '@services/chat'
import { useChatStore } from '@ui/chatStore'
import { LoadingSpinner } from '@ui/feedback'
import DebugPanel from './DebugPanel'
import '@ui/utilities.css'
import './PlanMessage.css'

type PlanMessageProps = {
  plan: Plan
}

export default function PlanMessage({ plan }: PlanMessageProps): React.ReactElement
{
  const [showCredDetails, setShowCredDetails] = useState(false)
  const [isLocalLoading, setIsLocalLoading] = useState(false) // Optimistic loading
  const proceedButtonRef = useRef<HTMLButtonElement>(null)

  // Get workflow state from chatStore
  const workflowState = useChatStore(state => state.workflowState)
  const state = workflowState.state

  const hasNeededCredentials = Array.isArray(plan.credentialsNeeded) && plan.credentialsNeeded.length > 0
  const hasAvailableCredentials = Array.isArray(plan.credentialsAvailable) && plan.credentialsAvailable.length > 0
  const hasAnyCredentials = hasNeededCredentials || hasAvailableCredentials

  // Auto-focus on proceed button for keyboard users (awaiting_approval state)
  useEffect(() =>
  {
    if (state === 'awaiting_approval' && proceedButtonRef.current)
    {
      // Delay to avoid interrupting screen reader announcement
      setTimeout(() => proceedButtonRef.current?.focus(), 100)
    }
  }, [state])

  // Handle approve with optimistic loading
  const handleApprove = (): void =>
  {
    setIsLocalLoading(true) // Immediate feedback
    chat.applyPlan(plan)
  }

  return (
    <div className="plan-message-container container-card mt-xs">
      <div className="plan-message-title text-bold text-sm text-primary">{plan.title}</div>
      <div className="plan-message-summary text-secondary text-xs mb-sm">{plan.summary}</div>

      {hasAnyCredentials && (
        <div className="plan-message-credentials mb-sm">
          {hasNeededCredentials && (
            <div className="plan-message-warning alert-warning mb-xs">
              <span className="plan-message-warning-icon" aria-hidden="true">⚠️</span>
              <strong>Setup Required</strong><br />
              {plan.credentialsNeeded?.length} credential{plan.credentialsNeeded?.length !== 1 ? 's' : ''} will need setup after creation.
            </div>
          )}

          {showCredDetails && (
            <div id="credential-details-panel" className="plan-message-cred-details container-elevated mt-xs">
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
            aria-expanded={showCredDetails}
            aria-controls="credential-details-panel"
            aria-label={showCredDetails ? 'Hide credential details' : 'Show credential details'}
          >
            <span aria-hidden="true">
              {showCredDetails ? '▼' : '▶'}
            </span>
            {' '}
            {showCredDetails ? 'Hide credential details' : 'Show credential details'}
          </button>
        </div>
      )}

      {/* Phase-specific footer */}
      <div className="plan-message-footer">
        {/* Awaiting Approval State */}
        {(state === 'awaiting_approval' && !isLocalLoading) && (
          <>
            <div className="plan-message-actions flex gap-sm mt-sm" role="group" aria-label="Plan approval actions">
              <button
                ref={proceedButtonRef}
                onClick={handleApprove}
                className="plan-message-apply-button btn btn-small"
                aria-label="Approve and create workflow"
              >
                ✓ {hasNeededCredentials ? 'Create & Open in n8n' : 'Create Workflow'}
              </button>
            </div>

            {hasNeededCredentials && (
              <div className="plan-message-info text-xs text-secondary mt-xs">
                After creation, you'll get a direct link to open the workflow and configure credentials.
              </div>
            )}
          </>
        )}

        {/* Executing State (or optimistic loading) */}
        {(state === 'executing' || isLocalLoading) && (
          <div className="plan-status plan-status--loading">
            <LoadingSpinner size="sm" inline />
            <span className="plan-status__text">Creating workflow in n8n...</span>
          </div>
        )}

        {/* Completed State */}
        {state === 'completed' && workflowState.workflowId && (
          <div className="plan-status plan-status--success">
            <div className="celebrate-icon" aria-hidden="true">✨</div>
            <span className="plan-status__text">Workflow created successfully!</span>
            <a
              href={`http://localhost:5678/workflow/${workflowState.workflowId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-small btn-celebrate"
            >
              Open in n8n →
            </a>
          </div>
        )}

        {/* Failed State */}
        {state === 'failed' && (
          <div
            className="plan-status plan-status--error"
            role="alert"
            aria-labelledby="error-title"
            aria-describedby="error-message"
          >
            <span className="error-icon" aria-hidden="true">✕</span>
            <div className="plan-status__error">
              <span id="error-title" className="sr-only">Error: Workflow creation failed</span>
              <p id="error-message" className="plan-status__text">
                {workflowState.error?.message || 'Failed to create workflow'}
              </p>
              <button
                onClick={() => setIsLocalLoading(false)} // Reset and allow retry
                className="btn btn-small"
                aria-label="Retry workflow creation"
              >
                <span aria-hidden="true">↻</span> Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <DebugPanel plan={plan} />
    </div>
  )
}
