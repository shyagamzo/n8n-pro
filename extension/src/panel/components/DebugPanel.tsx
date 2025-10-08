import React, { useState } from 'react'
import type { Plan } from '../../lib/types/plan'
import '../../lib/styles/utilities.css'
import './DebugPanel.css'

type DebugPanelProps = {
  plan: Plan
}

export default function DebugPanel({ plan }: DebugPanelProps): React.ReactElement
{
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'plan' | 'workflow' | 'validation'>('plan')

  if (!expanded)
  {
    return (
      <div className="debug-panel-collapsed border-top">
        <button onClick={() => setExpanded(true)} className="debug-panel-toggle w-full btn border rounded">
          🐛 Show Debug Info
        </button>
      </div>
    )
  }

  return (
    <div className="debug-panel container-card flex-column">
      <div className="debug-panel-header section-header">
        <span className="debug-panel-title section-header-title">🐛 Debug Information</span>
        <button onClick={() => setExpanded(false)} className="debug-panel-close btn-icon">
          ✕
        </button>
      </div>

      <div className="debug-panel-tabs">
        <button
          onClick={() => setActiveTab('plan')}
          className={`debug-panel-tab btn ${activeTab === 'plan' ? 'debug-panel-tab--active' : ''}`}
        >
          Plan
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          className={`debug-panel-tab btn ${activeTab === 'workflow' ? 'debug-panel-tab--active' : ''}`}
        >
          Workflow JSON
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`debug-panel-tab btn ${activeTab === 'validation' ? 'debug-panel-tab--active' : ''}`}
        >
          Validation
        </button>
      </div>

      <div className="debug-panel-content flex-1 overflow-auto">
        {activeTab === 'plan' && (
          <div className="debug-panel-code-block container-elevated">
            <div className="debug-panel-label text-bold text-xs">Full Plan Object:</div>
            <pre className="debug-panel-pre code-block">
              {JSON.stringify(plan, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="debug-panel-code-block container-elevated">
            <div className="debug-panel-label text-bold text-xs">Workflow Structure (sent to n8n API):</div>
            <pre className="debug-panel-pre code-block">
              {JSON.stringify(plan.workflow, null, 2)}
            </pre>
            <div className="debug-panel-help">
              💡 Copy this JSON to test directly with n8n's API
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="debug-panel-code-block container-elevated">
            <div className="debug-panel-label">Validation Summary:</div>
            <div className="debug-panel-validation-info">
              <div><strong>Workflow Name:</strong> {plan.workflow.name}</div>
              <div><strong>Node Count:</strong> {plan.workflow.nodes?.length || 0}</div>
              <div><strong>Connections:</strong> {Object.keys(plan.workflow.connections || {}).length}</div>
              <div><strong>Credentials Needed:</strong> {plan.credentialsNeeded?.length || 0}</div>
              <div><strong>Credentials Available:</strong> {plan.credentialsAvailable?.length || 0}</div>
            </div>

            {plan.workflow.nodes && (
              <>
                <div className="debug-panel-label">Nodes:</div>
                <ul className="debug-panel-list">
                  {(plan.workflow.nodes as Array<{ name?: string; type?: string; id?: string }>).map((node, idx) => (
                    <li key={idx} className="debug-panel-list-item">
                      <strong>{node.name || `Node ${idx}`}</strong>
                      <br />
                      <span className="debug-panel-node-type">Type: {node.type || 'unknown'}</span>
                      {node.id && <span className="debug-panel-node-id">ID: {node.id}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="debug-panel-help">
              💡 Check browser console for detailed validation logs
            </div>
          </div>
        )}
      </div>

      <div className="debug-panel-footer flex gap-sm border-top">
        <button onClick={() => copyToClipboard(plan)} className="debug-panel-copy-button btn btn-small flex-1 hoverable">
          📋 Copy Full Plan to Clipboard
        </button>
        <button onClick={() => copyToClipboard(plan.workflow)} className="debug-panel-copy-button btn btn-small flex-1 hoverable">
          📋 Copy Workflow JSON
        </button>
      </div>
    </div>
  )
}

async function copyToClipboard(data: unknown): Promise<void>
{
  try
  {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    // Success - clipboard write succeeded
  }
  catch (error)
  {
    console.error('❌ Failed to copy to clipboard:', error)
  }
}

