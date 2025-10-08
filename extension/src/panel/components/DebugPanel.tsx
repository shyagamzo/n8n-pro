import React, { useState } from 'react'
import type { Plan } from '../../lib/types/plan'

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
      <div style={collapsedStyle}>
        <button onClick={() => setExpanded(true)} style={toggleButtonStyle}>
          🐛 Show Debug Info
        </button>
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>🐛 Debug Information</span>
        <button onClick={() => setExpanded(false)} style={closeButtonStyle}>
          ✕
        </button>
      </div>

      <div style={tabBarStyle}>
        <button
          onClick={() => setActiveTab('plan')}
          style={activeTab === 'plan' ? activeTabStyle : tabStyle}
        >
          Plan
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          style={activeTab === 'workflow' ? activeTabStyle : tabStyle}
        >
          Workflow JSON
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          style={activeTab === 'validation' ? activeTabStyle : tabStyle}
        >
          Validation
        </button>
      </div>

      <div style={contentStyle}>
        {activeTab === 'plan' && (
          <div style={codeBlockStyle}>
            <div style={labelStyle}>Full Plan Object:</div>
            <pre style={preStyle}>
              {JSON.stringify(plan, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div style={codeBlockStyle}>
            <div style={labelStyle}>Workflow Structure (sent to n8n API):</div>
            <pre style={preStyle}>
              {JSON.stringify(plan.workflow, null, 2)}
            </pre>
            <div style={helpTextStyle}>
              💡 Copy this JSON to test directly with n8n's API
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div style={codeBlockStyle}>
            <div style={labelStyle}>Validation Summary:</div>
            <div style={validationInfoStyle}>
              <div><strong>Workflow Name:</strong> {plan.workflow.name}</div>
              <div><strong>Node Count:</strong> {plan.workflow.nodes?.length || 0}</div>
              <div><strong>Connections:</strong> {Object.keys(plan.workflow.connections || {}).length}</div>
              <div><strong>Credentials Needed:</strong> {plan.credentialsNeeded?.length || 0}</div>
              <div><strong>Credentials Available:</strong> {plan.credentialsAvailable?.length || 0}</div>
            </div>

            {plan.workflow.nodes && (
              <>
                <div style={labelStyle}>Nodes:</div>
                <ul style={listStyle}>
                  {(plan.workflow.nodes as Array<{ name?: string; type?: string; id?: string }>).map((node, idx) => (
                    <li key={idx} style={listItemStyle}>
                      <strong>{node.name || `Node ${idx}`}</strong>
                      <br />
                      <span style={nodeTypeStyle}>Type: {node.type || 'unknown'}</span>
                      {node.id && <span style={nodeIdStyle}>ID: {node.id}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div style={helpTextStyle}>
              💡 Check browser console for detailed validation logs
            </div>
          </div>
        )}
      </div>

      <div style={footerStyle}>
        <button onClick={() => copyToClipboard(plan)} style={copyButtonStyle}>
          📋 Copy Full Plan to Clipboard
        </button>
        <button onClick={() => copyToClipboard(plan.workflow)} style={copyButtonStyle}>
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

// Styles
const collapsedStyle: React.CSSProperties = {
  padding: '8px',
  borderTop: '1px solid #e5e7eb',
}

const panelStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  marginTop: '12px',
  backgroundColor: '#f9fafb',
  maxHeight: '600px',
  display: 'flex',
  flexDirection: 'column',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#fff',
  borderTopLeftRadius: '8px',
  borderTopRightRadius: '8px',
}

const titleStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '14px',
}

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '18px',
  color: '#6b7280',
  padding: '0 4px',
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#fff',
}

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  color: '#6b7280',
}

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  color: '#4f46e5',
  borderBottom: '2px solid #4f46e5',
  fontWeight: '500',
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '12px',
}

const codeBlockStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
}

const labelStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '13px',
  marginBottom: '8px',
  color: '#374151',
}

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: '12px',
  backgroundColor: '#1f2937',
  color: '#10b981',
  borderRadius: '4px',
  fontSize: '12px',
  overflow: 'auto',
  maxHeight: '400px',
  fontFamily: 'monospace',
}

const validationInfoStyle: React.CSSProperties = {
  padding: '12px',
  backgroundColor: '#f3f4f6',
  borderRadius: '4px',
  fontSize: '13px',
  lineHeight: '1.8',
  marginBottom: '12px',
}

const listStyle: React.CSSProperties = {
  margin: '8px 0',
  padding: '0 0 0 20px',
}

const listItemStyle: React.CSSProperties = {
  marginBottom: '8px',
  fontSize: '13px',
}

const nodeTypeStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  marginRight: '12px',
}

const nodeIdStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
}

const helpTextStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '8px',
  backgroundColor: '#eff6ff',
  borderLeft: '3px solid #3b82f6',
  fontSize: '12px',
  color: '#1e40af',
}

const footerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '12px',
  borderTop: '1px solid #e5e7eb',
  backgroundColor: '#fff',
  borderBottomLeftRadius: '8px',
  borderBottomRightRadius: '8px',
}

const copyButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '13px',
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#374151',
}

const toggleButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#6b7280',
}

