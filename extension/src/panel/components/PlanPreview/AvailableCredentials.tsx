import React from 'react'
import type { CredentialRef } from '../../../lib/types/plan'

type AvailableCredentialsProps = {
  credentials: CredentialRef[]
  showDetails: boolean
  hasNeededCredentials: boolean
}

const styles = {
  container: (hasMargin: boolean) => ({
    marginBottom: hasMargin ? 8 : 0,
    padding: 8,
    background: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: 6,
  }),
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
    color: '#065f46',
  },
  message: {
    fontSize: '12px',
    color: '#047857',
  },
  details: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #10b981',
  },
  credentialItem: {
    fontSize: '11px',
    color: '#047857',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
} as const

export default function AvailableCredentials({
  credentials,
  showDetails,
  hasNeededCredentials,
}: AvailableCredentialsProps): React.ReactElement
{
  return (
    <div style={styles.container(hasNeededCredentials)}>
      <div style={styles.header}>
        <span style={styles.icon}>✓</span>
        <span style={styles.title}>Credentials Ready</span>
      </div>

      <div style={styles.message}>
        {credentials.length} credential{credentials.length > 1 ? 's are' : ' is'} already configured.
      </div>

      {showDetails && (
        <div style={styles.details}>
          {credentials.map((cred, idx) => (
            <div key={idx} style={styles.credentialItem}>
              <span>✓</span>
              <span>
                <strong>{cred.name || cred.type}</strong> - {cred.requiredFor || 'Ready to use'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

