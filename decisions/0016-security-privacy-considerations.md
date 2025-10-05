# Decision Record: Security & Privacy Considerations

## API Key Management

### Secure Storage
- **Chrome Extension Storage**: Use `chrome.storage.local` for API keys (encrypted by browser)
- **No localStorage**: Avoid localStorage for sensitive data (accessible to page scripts)
- **No sessionStorage**: Avoid sessionStorage (cleared on tab close)
- **Encryption**: Browser handles encryption of chrome.storage.local automatically

### Key Handling
- **OpenAI API Keys**: Store securely, never log or expose in console
- **n8n API Keys**: Store securely, only send in authenticated requests
- **Key Validation**: Validate API key format before storage
- **Key Rotation**: Support for updating API keys without data loss
- **Credential Separation**: n8n credentials stored separately by n8n, referenced by ID only

### Access Control
- **Options Page Only**: API keys can only be set/modified in extension options
- **Background Worker**: Only background worker can access stored keys
- **Content Script**: Never has direct access to API keys
- **Panel UI**: Never displays full API keys (show masked version)

## Data Handling

### Local Data Only
- **No External Storage**: All data stays on user's machine
- **No Cloud Sync**: No data sent to external servers (except API calls)
- **No Analytics**: No usage tracking or telemetry in MVP
- **No Crash Reporting**: No automatic error reporting

### Workflow Data
- **Read-Only Access**: Extension only reads workflow metadata (names, IDs)
- **No Workflow Content**: Never store or transmit actual workflow definitions
- **Credential References Only**: Only access credential IDs/names, never credential values
- **No Execution Data**: Don't store workflow execution results

### n8n Credential Handling
- **Credential IDs**: n8n stores credentials separately and references them by ID
- **No Credential Values**: Never access actual credential values (API keys, passwords, etc.)
- **Credential Presence Check**: Only check if required credentials exist by ID/name
- **LLM Safety**: LLM agents never receive credential values, only credential references

### Chat Data
- **Session-Only**: Chat history not persisted (deferred to future version)
- **Memory Cleanup**: Clear chat data when panel closes
- **No Chat Storage**: No permanent storage of user conversations
- **No Chat Analysis**: No analysis of user messages for improvement

## Network Security

### API Communication
- **HTTPS Only**: All API calls use HTTPS
- **Certificate Validation**: Validate SSL certificates
- **Request Sanitization**: Sanitize all user inputs before API calls
- **Response Validation**: Validate API responses before processing

### CORS Handling
- **Same-Origin Policy**: Respect browser security policies
- **Preflight Requests**: Handle CORS preflight requests properly
- **Origin Validation**: Validate request origins
- **No Bypass**: Don't bypass browser security features

## Extension Permissions

### Minimal Permissions
- **storage**: For API key storage only
- **scripting**: For content script injection
- **host_permissions**: Only for localhost n8n instances
- **No Active Tab**: Don't request activeTab permission
- **No All URLs**: Don't request access to all websites

### Permission Justification
- **storage**: Required for secure API key storage
- **scripting**: Required to inject chatbot into n8n pages
- **host_permissions**: Required to communicate with n8n API
- **No Unnecessary**: Reject any permission not directly needed

## Privacy Protection

### User Data
- **No Personal Data**: Don't collect personal information
- **No Usage Tracking**: Don't track user behavior
- **No Device Fingerprinting**: Don't create device profiles
- **No Cross-Site Tracking**: Don't track across websites

### Data Minimization
- **Only Necessary Data**: Store only what's required for functionality
- **Automatic Cleanup**: Clear temporary data regularly
- **No Data Aggregation**: Don't aggregate data across users
- **No Data Sharing**: Don't share data with third parties

## Security Best Practices

### Code Security
- **Input Validation**: Validate all user inputs
- **Output Encoding**: Encode outputs to prevent XSS
- **No Eval**: Never use eval() or similar functions
- **CSP Compliance**: Follow Content Security Policy

### API Security
- **Rate Limiting**: Respect API rate limits
- **Error Handling**: Don't expose sensitive information in errors
- **Timeout Handling**: Set reasonable timeouts for API calls
- **Retry Logic**: Implement secure retry mechanisms

## Threat Mitigation

### Common Threats
- **API Key Theft**: Secure storage and access control
- **Data Leakage**: No external data transmission
- **XSS Attacks**: Input validation and output encoding
- **CSRF Attacks**: Origin validation and secure requests

### Monitoring
- **Error Logging**: Log errors locally (no external transmission)
- **Security Events**: Monitor for suspicious activity
- **Key Usage**: Monitor API key usage patterns
- **Access Patterns**: Monitor unusual access patterns

## Compliance

### Privacy Regulations
- **GDPR Compliance**: No personal data collection
- **CCPA Compliance**: No data sale or sharing
- **Local Laws**: Comply with local privacy laws
- **Transparency**: Clear privacy policy and data handling

### Security Standards
- **OWASP Guidelines**: Follow OWASP security guidelines
- **Chrome Store**: Meet Chrome Web Store security requirements
- **Industry Standards**: Follow industry security best practices
- **Regular Updates**: Keep dependencies updated for security

## Open Items
- **Privacy Policy**: Draft comprehensive privacy policy
- **Security Audit**: Plan for security review before release
- **Incident Response**: Define security incident response plan
- **User Education**: Security best practices for users
