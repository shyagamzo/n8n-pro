import React from 'react'
import type { CredentialRef } from '@shared/types/plan'
import './CredentialComponents.css'

type NeededCredentialsProps = {
  credentials: CredentialRef[]
  showDetails: boolean
  workflowId?: string  // Optional: enables node-specific deep links
}

export default function NeededCredentials({
  credentials,
  showDetails,
  workflowId,
}: NeededCredentialsProps): React.ReactElement
{
  const baseUrl = 'http://localhost:5678'

  return (
    <div className="needed-credentials">
      <div className="needed-credentials-header">
        <span className="needed-credentials-icon">⚠️</span>
        <span className="needed-credentials-title">Setup Required</span>
      </div>

      <div className="needed-credentials-message">
        {credentials.length} credential{credentials.length > 1 ? 's' : ''} will need setup after creation.
      </div>

      {showDetails && (
        <div className="needed-credentials-details">
          {credentials.map((cred, idx) => (
            <div key={idx} className="needed-credentials-item">
              <div className="needed-credentials-name">
                {cred.nodeName || cred.name || cred.type}
              </div>

              <div className="needed-credentials-type">
                Type: <code className="needed-credentials-type-code">{cred.type}</code>
              </div>

              {cred.requiredFor && (
                <div className="needed-credentials-required-for">
                  Required for: {cred.requiredFor}
                </div>
              )}

              {workflowId && cred.nodeId && (
                <div className="credential-link-wrapper">
                  <a
                    href={`${baseUrl}/workflow/${workflowId}/${encodeURIComponent(cred.nodeId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="needed-credentials-link"
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
                className="needed-credentials-link"
              >
                Create new credential ↗
              </a>
            </div>
          ))}

          <div className="needed-credentials-tip">
            💡 <strong>Tip:</strong> After creation, click node links to configure credentials directly, or create new credentials first.
          </div>
        </div>
      )}
    </div>
  )
}

