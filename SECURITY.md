# Security Policy

## Overview

The n8n Pro Extension is designed with security as a core principle. This document outlines the security measures implemented and best practices for users.

## Data Security

### API Key Storage
- **Storage Method**: All API keys are stored using `chrome.storage.local`
- **Encryption**: Chrome automatically encrypts data in `chrome.storage.local`
- **Scope**: API keys are only accessible to the extension's background service worker
- **No Cloud Storage**: No data is sent to external servers except OpenAI API calls

### Data Flow
```
User Input → Content Script → Background Worker → OpenAI API
                ↓
            Chrome Storage (Encrypted)
                ↓
            n8n API (User's Instance)
```

## Security Measures

### 1. Input Sanitization
- **Markdown Rendering**: Uses DOMPurify to sanitize all HTML content
- **User Input**: All user messages are validated before processing
- **Workflow Data**: Workflow structures are validated before API calls

### 2. API Key Protection
- **No Logging**: API keys are never logged to console
- **Masking**: Debug utilities automatically mask sensitive fields
- **Secure Transmission**: API keys only sent over HTTPS to OpenAI

### 3. Content Security Policy
- **Strict CSP**: Extension uses restrictive content security policy
- **No Inline Scripts**: All JavaScript is loaded from extension files
- **External Resources**: Only allows connections to OpenAI and user's n8n instance

### 4. Permission Model
- **Minimal Permissions**: Extension only requests necessary permissions
- **Storage**: Only `chrome.storage.local` for settings
- **Scripting**: Only for injecting UI into n8n pages
- **Host Permissions**: Only for n8n instances and OpenAI API

## User Responsibilities

### API Key Management
1. **Keep Keys Secure**: Never share your API keys
2. **Regular Rotation**: Rotate API keys periodically
3. **Monitor Usage**: Check OpenAI dashboard for unusual activity
4. **Revoke if Compromised**: Immediately revoke compromised keys

### n8n Instance Security
1. **Secure Access**: Use HTTPS for n8n instances
2. **API Key Permissions**: Limit n8n API key permissions
3. **Network Security**: Ensure n8n instance is properly secured
4. **Regular Updates**: Keep n8n instance updated

## Security Best Practices

### For Users
- Use strong, unique API keys
- Enable 2FA on OpenAI account
- Use HTTPS for n8n instances
- Regularly review API usage
- Keep the extension updated

### For Developers
- Never log sensitive data
- Validate all inputs
- Use secure storage methods
- Implement proper error handling
- Regular security audits

## Vulnerability Reporting

If you discover a security vulnerability, please:

1. **DO NOT** create a public issue
2. Email security concerns to: [security-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Updates

- **Critical**: Immediate patch release
- **High**: Within 48 hours
- **Medium**: Within 1 week
- **Low**: Next regular release

## Data Privacy

### What We Collect
- **Nothing**: The extension does not collect any user data
- **Local Storage Only**: All data remains on your device
- **No Analytics**: No usage tracking or analytics

### What We Don't Collect
- Personal information
- Workflow content
- API keys (stored locally only)
- Usage patterns
- Any data that could identify you

### Third-Party Services
- **OpenAI**: Only sends conversation context for AI processing
- **n8n**: Only sends workflow data to your instance
- **No Other Services**: No data sent to any other services

## Compliance

### GDPR
- No personal data collection
- No data processing
- No data retention
- User has full control over their data

### Chrome Web Store
- Complies with Chrome Web Store policies
- No malicious code
- Transparent permissions
- Regular security reviews

## Security Checklist

### Before Installation
- [ ] Verify extension source
- [ ] Check permissions requested
- [ ] Review privacy policy
- [ ] Ensure secure n8n instance

### After Installation
- [ ] Configure API keys securely
- [ ] Test with non-sensitive data first
- [ ] Monitor API usage
- [ ] Keep extension updated

### Regular Maintenance
- [ ] Rotate API keys quarterly
- [ ] Review n8n API key permissions
- [ ] Check for extension updates
- [ ] Monitor for security advisories

## Contact

For security-related questions or concerns:
- **Email**: [security-email]
- **Issues**: Use private security reporting
- **Documentation**: Check this file for updates

---

**Last Updated**: [Current Date]  
**Version**: 0.1.0  
**Next Review**: [Next Review Date]