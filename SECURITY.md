# Security Policy

> Security guidelines and vulnerability reporting for the n8n Pro Extension

## Security Model

### Threat Model

**Assets to Protect:**
1. User API keys (OpenAI, n8n)
2. n8n workflow data
3. Chat conversation history
4. Extension configuration

**Threat Actors:**
1. Malicious websites attempting to steal data
2. Malicious extensions in the browser
3. Network attackers (MITM)
4. Malicious n8n workflows

---

## Security Features

### 1. API Key Protection ✅

**Storage:**
- Keys stored in `chrome.storage.local` (browser-encrypted)
- Never exposed to content scripts
- Never logged or displayed in console
- Masked in UI (shows only last 4 characters)

**Access Control:**
- Background worker is the only component with key access
- Options page can write but not read full keys
- Content scripts have zero access
- Keys validated before storage

**Code:**
```typescript
// ✅ Secure: Background worker only
const apiKey = await getOpenAiKey()

// ❌ Never: Content script access
// Content scripts should never call getOpenAiKey()
```

---

### 2. Content Security Policy ✅

**Extension Pages CSP:**
```
script-src 'self';
object-src 'self';
connect-src 'self' https://api.openai.com http://localhost:5678 ...
```

**Protection:**
- No inline scripts allowed
- No eval() or Function() constructors
- Only whitelisted API endpoints
- No external script loading

---

### 3. Input Validation ✅

**All User Inputs Validated:**
- API keys: Format validation before storage
- URLs: Protocol and format validation
- Chat messages: Length limits (1-10K chars)
- Workflow names: Sanitized and length-limited

**Sanitization:**
- HTML escaping for display
- Control character removal
- XSS prevention via DOMPurify
- SQL injection N/A (no database)

---

### 4. Network Security ✅

**HTTPS Enforcement:**
- OpenAI API: HTTPS only
- n8n API: HTTP/HTTPS validated
- Certificate validation enabled
- No certificate bypass

**Request Security:**
- Timeouts on all requests (10-15s)
- Rate limiting to prevent abuse
- Retry with exponential backoff
- No credential bypass

---

### 5. Data Privacy ✅

**Local-First Architecture:**
- All data stays on user's machine
- No telemetry or analytics
- No external data transmission (except APIs)
- No crash reporting to third parties

**Data Minimization:**
- Chat history: Session-only (not persisted)
- Logs: In-memory only, 100 entry limit
- Workflow data: Never stored, only read from n8n
- Credentials: Never accessed, only check existence

---

### 6. Credential Safety ✅

**n8n Credentials:**
- Extension never accesses credential values
- Only references credential IDs/types
- LLM never receives credential data
- Users set up credentials manually in n8n

**Why This Matters:**
- Prevents accidental exposure
- Prevents LLM from seeing secrets
- Prevents transmission to OpenAI
- Follows principle of least privilege

---

### 7. Dependency Security

**Regular Updates:**
- Dependencies scanned for vulnerabilities
- Regular updates via Dependabot
- Security patches applied promptly

**Critical Dependencies:**
- `marked`: Markdown parsing (XSS risk)
- `dompurify`: HTML sanitization (XSS risk)
- `@langchain/openai`: API client
- `react`: UI framework

**Auditing:**
```bash
# Check for vulnerabilities
yarn audit

# Update dependencies
yarn upgrade-interactive
```

---

### 8. Error Handling Security ✅

**Safe Error Messages:**
- Never expose API keys in errors
- Never expose internal paths
- Never expose stack traces to users
- Sanitize error context automatically

**Logging Security:**
- Automatic sanitization of sensitive data
- API keys replaced with `[REDACTED]`
- Tokens masked in logs
- No production logging to external services

---

## Security Checklist

### Development

- [ ] All user inputs validated
- [ ] No inline scripts in HTML
- [ ] No eval() or Function() constructors
- [ ] All API calls use background worker
- [ ] Sensitive data sanitized from logs
- [ ] Error messages don't expose internals

### Code Review

- [ ] API keys never logged
- [ ] No localStorage for sensitive data
- [ ] Input validation on all entry points
- [ ] XSS prevention in place
- [ ] CSP policies respected
- [ ] Rate limiting implemented

### Testing

- [ ] Test invalid API keys
- [ ] Test XSS attack vectors
- [ ] Test CSRF scenarios
- [ ] Test rate limit handling
- [ ] Test error message sanitization

### Release

- [ ] Dependencies updated
- [ ] Security audit completed
- [ ] Vulnerability scan passed
- [ ] CSP validated
- [ ] Permissions minimized

---

## Vulnerability Disclosure

### Reporting a Vulnerability

If you discover a security vulnerability, please email:

**Email:** [security@example.com]

**Please Include:**
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 1 week
- **Fix Development:** Depends on severity
- **Public Disclosure:** After fix is released

### Severity Levels

**Critical:**
- API key exposure
- Remote code execution
- Privilege escalation

**High:**
- XSS vulnerabilities
- CSRF vulnerabilities
- Data leakage

**Medium:**
- Information disclosure
- DoS vulnerabilities
- Authentication bypass

**Low:**
- UI bugs
- Minor information leaks
- Non-security bugs

---

## Security Best Practices

### For Users

1. **Keep Extension Updated**
   - Enable automatic updates
   - Review release notes
   - Update dependencies regularly

2. **API Key Safety**
   - Never share your API keys
   - Rotate keys periodically
   - Use separate keys for different apps
   - Monitor API usage for anomalies

3. **n8n Instance Security**
   - Use HTTPS when possible
   - Keep n8n updated
   - Use strong API keys
   - Review workflow permissions

4. **Browser Security**
   - Keep Chrome/Edge updated
   - Review installed extensions
   - Use strong browser profile password
   - Enable browser sync carefully

### For Developers

1. **API Key Handling**
   ```typescript
   // ✅ Good: Use secure storage
   await setOpenAiKey(key)
   
   // ❌ Bad: Log keys
   console.log('API key:', key)
   ```

2. **Input Validation**
   ```typescript
   // ✅ Good: Validate before use
   const message = validateChatMessage(userInput)
   
   // ❌ Bad: Use raw input
   const message = userInput
   ```

3. **Error Handling**
   ```typescript
   // ✅ Good: Sanitize errors
   logger.error('Failed to call API', error)
   
   // ❌ Bad: Expose internals
   console.error('API key failed:', apiKey, error)
   ```

4. **Network Requests**
   ```typescript
   // ✅ Good: Background worker only
   // In background/index.ts
   await fetch(url, { headers: { 'X-API-Key': key } })
   
   // ❌ Bad: From content script
   // Never do this in content scripts
   ```

---

## Known Security Limitations

### 1. HTTP n8n Instances

**Limitation:** Extension supports HTTP n8n instances (localhost)

**Risk:** MITM attacks on local network

**Mitigation:**
- Use HTTPS when possible
- Trust local network only
- Don't expose n8n publicly

### 2. Browser Storage Encryption

**Limitation:** Relies on browser's encryption of `chrome.storage.local`

**Risk:** If browser is compromised, keys are exposed

**Mitigation:**
- Keep browser updated
- Use OS-level disk encryption
- Don't share browser profiles

### 3. LLM API Communication

**Limitation:** Workflow descriptions sent to OpenAI

**Risk:** Sensitive workflow details exposed to OpenAI

**Mitigation:**
- Review workflow descriptions
- Don't include sensitive data in names
- Use self-hosted LLM (future)

### 4. No Credential Value Access

**Feature, not Bug:** Extension cannot help set up credential values

**Why:** Security by design - we never touch credential data

**Trade-off:** Users must set up credentials manually in n8n

---

## Security Updates

### Version History

**v0.0.1 (Current)**
- Initial release
- Basic security features
- API key encryption
- Input validation
- CSP implementation

**Future Enhancements:**
- [ ] Certificate pinning
- [ ] Hardware key support (U2F)
- [ ] End-to-end encryption for chat
- [ ] Self-hosted LLM support
- [ ] Security audit by third party

---

## Compliance

### GDPR Compliance

- ✅ No personal data collection
- ✅ No data transmitted to third parties (except APIs)
- ✅ User controls all data
- ✅ Data deletion supported (clear storage)
- ✅ No cookies or tracking

### CCPA Compliance

- ✅ No data sale
- ✅ No data sharing
- ✅ User data stays local
- ✅ Transparent about data usage

### SOC 2 (Future)

- [ ] Access controls
- [ ] Audit logging
- [ ] Incident response plan
- [ ] Security training

---

## Security Contacts

**Security Team:** [security@example.com]  
**PGP Key:** [Include PGP public key for encrypted communications]

---

## License

This security policy is part of the n8n Pro Extension project and is subject to the same MIT license.

---

**Last Updated:** 2025-01
