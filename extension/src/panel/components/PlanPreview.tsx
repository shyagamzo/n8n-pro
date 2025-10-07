import React from 'react'
import type { Plan } from '../../lib/types/plan'
import { chat } from '../../lib/services/chat'

type PlanPreviewProps = {
  plan: Plan
  onCancel: () => void
}

export default function PlanPreview({ plan, onCancel }: PlanPreviewProps): React.ReactElement
{
  return (
    <div style={{ marginTop: 8, padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{plan.title}</div>
      <div style={{ color: '#374151', marginBottom: 8 }}>{plan.summary}</div>
      {Array.isArray(plan.credentialsNeeded) && plan.credentialsNeeded.length > 0 && (
        <div style={{ marginBottom: 8, color: '#6b7280' }}>
          Missing credentials detected. You can set them up from n8n later.
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => chat.applyPlan(plan)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer' }}>Apply</button>
        <button onClick={onCancel} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#111827', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}
