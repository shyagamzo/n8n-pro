import React, { useState } from 'react'
import type { Plan } from '../../lib/types/plan'
import { chat } from '../../lib/services/chat'
import DebugPanel from './DebugPanel'

type PlanMessageProps = {
  plan: Plan
}

export default function PlanMessage({ plan }: PlanMessageProps): React.ReactElement
{
  const [showCredDetails, setShowCredDetails] = useState(false)

  const hasNeededCredentials = Array.isArray(plan.credentialsNeeded) && plan.credentialsNeeded.length > 0
  const hasAvailableCredentials = Array.isArray(plan.credentialsAvailable) && plan.credentialsAvailable.length > 0
  const hasAnyCredentials = hasNeededCredentials || hasAvailableCredentials

  const containerStyle: React.CSSProperties = {
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#f9fafb',
    marginTop: '8px',
  }

  const titleStyle: React.CSSProperties = {
    fontWeight: '600',
    marginBottom: '6px',
    fontSize: '14px',
    color: '#111827',
  }

  const summaryStyle: React.CSSProperties = {
    color: '#374151',
    marginBottom: '10px',
    fontSize: '13px',
    lineHeight: '1.4',
  }

  const credentialsContainerStyle: React.CSSProperties = {
    marginBottom: '10px',
  }

  const warningStyle: React.CSSProperties = {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    padding: '8px',
    marginBottom: '8px',
    fontSize: '12px',
  }

  const warningIconStyle: React.CSSProperties = {
    display: 'inline-block',
    marginRight: '6px',
    color: '#d97706',
  }

  const toggleButtonStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#6b7280',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    marginTop: '6px',
    textDecoration: 'underline',
  }

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  }

  const applyButtonStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: '6px',
    border: 'none',
    background: '#10b981',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
  }

  const infoTextStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '8px',
    lineHeight: '1.3',
  }

  const credDetailsStyle: React.CSSProperties = {
    marginTop: '8px',
    padding: '8px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '12px',
  }

  const credItemStyle: React.CSSProperties = {
    margin: '4px 0',
    padding: '4px',
    background: '#f9fafb',
    borderRadius: '4px',
  }

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{plan.title}</div>
      <div style={summaryStyle}>{plan.summary}</div>

      {hasAnyCredentials && (
        <div style={credentialsContainerStyle}>
          {hasNeededCredentials && (
            <div style={warningStyle}>
              <span style={warningIconStyle}>⚠️</span>
              <strong>Setup Required</strong><br />
              {plan.credentialsNeeded?.length} credential{plan.credentialsNeeded?.length !== 1 ? 's' : ''} will need setup after creation.
            </div>
          )}

          {showCredDetails && (
            <div style={credDetailsStyle}>
              {hasAvailableCredentials && plan.credentialsAvailable && (
                <div>
                  <strong>Available Credentials:</strong>
                  {plan.credentialsAvailable.map((cred, idx) => (
                    <div key={idx} style={credItemStyle}>
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
                    <div key={idx} style={credItemStyle}>
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
            style={toggleButtonStyle}
          >
            {showCredDetails ? '▼ Hide credential details' : '▶ Show credential details'}
          </button>
        </div>
      )}

      <div style={actionsStyle}>
        <button onClick={() => chat.applyPlan(plan)} style={applyButtonStyle}>
          {hasNeededCredentials ? 'Create & Open in n8n' : 'Create Workflow'}
        </button>
      </div>

      {hasNeededCredentials && (
        <div style={infoTextStyle}>
          After creation, you'll get a direct link to open the workflow and configure credentials.
        </div>
      )}

      <DebugPanel plan={plan} />
    </div>
  )
}
