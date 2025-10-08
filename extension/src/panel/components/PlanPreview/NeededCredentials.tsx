import React from 'react'
import type { CredentialRef } from '../../../lib/types/plan'

type NeededCredentialsProps = {
  credentials: CredentialRef[]
  showDetails: boolean
  workflowId?: string  // Optional: enables node-specific deep links
}

const styles = {
  container: {
    padding: 8,
    background: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: 6,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  icon: {
    fontSize: '16px',
  },
  title: {
    fontWeight: 600,
    fontSize: '13px',
    color: '#92400e',
  },
  message: {
    fontSize: '12px',
    color: '#78350f',
    marginBottom: 6,
  },
  details: {
    marginTop: 8,
    padding: 8,
    background: '#fff',
    borderRadius: 4,
    border: '1px solid #fbbf24',
  },
  credentialItem: {
    marginBottom: 8,
  },
  credentialName: {
    fontWeight: 600,
    fontSize: '12px',
    color: '#111827',
    marginBottom: 2,
  },
  credentialType: {
    fontSize: '11px',
    color: '#6b7280',
    marginBottom: 4,
  },
  typeCode: {
    background: '#f3f4f6',
    padding: '2px 4px',
    borderRadius: 3,
  },
  requiredFor: {
    fontSize: '11px',
    color: '#6b7280',
    marginBottom: 4,
  },
  setupLink: {
    fontSize: '11px',
    color: '#2563eb',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  tip: {
    marginTop: 8,
    padding: 6,
    background: '#fef3c7',
    borderRadius: 4,
    fontSize: '11px',
    color: '#78350f',
  },
} as const

export default function NeededCredentials({
  credentials,
  showDetails,
  workflowId,
}: NeededCredentialsProps): React.ReactElement
{
  const baseUrl = 'http://localhost:5678'

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>⚠️</span>
        <span style={styles.title}>Setup Required</span>
      </div>

      <div style={styles.message}>
        {credentials.length} credential{credentials.length > 1 ? 's' : ''} will need setup after creation.
      </div>

      {showDetails && (
        <div style={styles.details}>
          {credentials.map((cred, idx) => (
            <div
              key={idx}
              style={{
                ...styles.credentialItem,
                marginBottom: idx < credentials.length - 1 ? 8 : 0,
              }}
            >
              <div style={styles.credentialName}>
                {cred.nodeName || cred.name || cred.type}
              </div>

              <div style={styles.credentialType}>
                Type: <code style={styles.typeCode}>{cred.type}</code>
              </div>

              {cred.requiredFor && (
                <div style={styles.requiredFor}>
                  Required for: {cred.requiredFor}
                </div>
              )}

              {workflowId && cred.nodeId && (
                <div style={{ fontSize: '11px', marginBottom: 4 }}>
                  <a
                    href={`${baseUrl}/workflow/${workflowId}/${encodeURIComponent(cred.nodeId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.setupLink}
                  >
                    Open node in n8n ↗
                  </a>
                  {' or '}
                </div>
              )}

              <a
                href={`${baseUrl}/credentials/new/${encodeURIComponent(cred.type)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.setupLink}
              >
                Create new credential ↗
              </a>
            </div>
          ))}

          <div style={styles.tip}>
            💡 <strong>Tip:</strong> After creation, click node links to configure credentials directly, or create new credentials first.
          </div>
        </div>
      )}
    </div>
  )
}

