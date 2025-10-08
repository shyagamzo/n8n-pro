import React from 'react'
import type { CredentialRef } from '../../../lib/types/plan'

type NeededCredentialsProps = {
  credentials: CredentialRef[]
  showDetails: boolean
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
}: NeededCredentialsProps): React.ReactElement
{
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>⚠️</span>
        <span style={styles.title}>Setup Required</span>
      </div>

      <div style={styles.message}>
        This workflow needs {credentials.length} credential{credentials.length > 1 ? 's' : ''}.
        {' '}Set them up in n8n after creation.
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
                {cred.name || cred.type}
              </div>

              <div style={styles.credentialType}>
                Type: <code style={styles.typeCode}>{cred.type}</code>
              </div>

              {cred.requiredFor && (
                <div style={styles.requiredFor}>
                  Required for: {cred.requiredFor}
                </div>
              )}

              <a
                href={`http://localhost:5678/credentials/new/${encodeURIComponent(cred.type)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.setupLink}
              >
                Set up in n8n ↗
              </a>
            </div>
          ))}

          <div style={styles.tip}>
            💡 <strong>Tip:</strong> After applying this workflow, configure these credentials in n8n before running.
          </div>
        </div>
      )}
    </div>
  )
}

