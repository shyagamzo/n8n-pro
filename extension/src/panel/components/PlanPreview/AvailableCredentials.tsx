import React from 'react'
import type { CredentialRef } from '../../../lib/types/plan'
import './CredentialComponents.css'

type AvailableCredentialsProps = {
  credentials: CredentialRef[]
  showDetails: boolean
  hasNeededCredentials: boolean
}

export default function AvailableCredentials({
  credentials,
  showDetails,
  hasNeededCredentials,
}: AvailableCredentialsProps): React.ReactElement
{
  const containerClass = `available-credentials ${hasNeededCredentials ? 'available-credentials--with-margin' : ''}`.trim()

  return (
    <div className={containerClass}>
      <div className="available-credentials-header">
        <span className="available-credentials-icon">✓</span>
        <span className="available-credentials-title">Credentials Ready</span>
      </div>

      <div className="available-credentials-message">
        {credentials.length} credential{credentials.length > 1 ? 's are' : ' is'} already configured.
      </div>

      {showDetails && (
        <div className="available-credentials-details">
          {credentials.map((cred, idx) => (
            <div key={idx} className="available-credentials-item">
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

