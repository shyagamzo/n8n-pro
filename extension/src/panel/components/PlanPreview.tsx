import React, { useState } from 'react'
import type { Plan } from '../../lib/types/plan'
import { chat } from '../../lib/services/chat'

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
    <div style={{ marginTop: 8, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '14px' }}>{plan.title}</div>
      <div style={{ color: '#374151', marginBottom: 10, fontSize: '13px' }}>{plan.summary}</div>

      {hasAnyCredentials && (
        <div style={{ marginBottom: 10 }}>
          {/* Available Credentials Section */}
          {hasAvailableCredentials && plan.credentialsAvailable && (
            <div style={{ marginBottom: hasNeededCredentials ? 8 : 0, padding: 8, background: '#d1fae5', border: '1px solid #10b981', borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: '16px' }}>✓</span>
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#065f46' }}>
                  Credentials Ready
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#047857' }}>
                {plan.credentialsAvailable.length} credential{plan.credentialsAvailable.length > 1 ? 's are' : ' is'} already configured.
              </div>
              {showCredDetails && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #10b981' }}>
                  {plan.credentialsAvailable.map((cred, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: '#047857', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>✓</span>
                      <span><strong>{cred.name || cred.type}</strong> - {cred.requiredFor || 'Ready to use'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Missing Credentials Section */}
          {hasNeededCredentials && (
            <div style={{ padding: 8, background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#92400e' }}>
                  Setup Required
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#78350f', marginBottom: 6 }}>
                This workflow needs {plan.credentialsNeeded.length} credential{plan.credentialsNeeded.length > 1 ? 's' : ''}.
                {' '}Set them up in n8n after creation.
              </div>

              {showCredDetails && (
                <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 4, border: '1px solid #fbbf24' }}>
                  {plan.credentialsNeeded.map((cred, idx) => (
                    <div key={idx} style={{ marginBottom: idx < plan.credentialsNeeded.length - 1 ? 8 : 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#111827', marginBottom: 2 }}>
                        {cred.name || cred.type}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: 4 }}>
                        Type: <code style={{ background: '#f3f4f6', padding: '2px 4px', borderRadius: 3 }}>{cred.type}</code>
                      </div>
                      {cred.requiredFor && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: 4 }}>
                          Required for: {cred.requiredFor}
                        </div>
                      )}
                      <a
                        href={`http://localhost:5678/credentials/new/${encodeURIComponent(cred.type)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '11px',
                          color: '#2563eb',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        Set up in n8n ↗
                      </a>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, padding: 6, background: '#fef3c7', borderRadius: 4, fontSize: '11px', color: '#78350f' }}>
                    💡 <strong>Tip:</strong> After applying this workflow, configure these credentials in n8n before running.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toggle Details Button */}
          <button
            onClick={() => setShowCredDetails(!showCredDetails)}
            style={{
              fontSize: '11px',
              color: '#6b7280',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              marginTop: 6,
              textDecoration: 'underline'
            }}
          >
            {showCredDetails ? '▼ Hide credential details' : '▶ Show credential details'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => chat.applyPlan(plan)}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            background: '#10b981',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '13px'
          }}
        >
          Apply Workflow
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#fff',
            color: '#111827',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '13px'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
