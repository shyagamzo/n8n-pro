# System Constraints and Rules

Global constraints that apply to all agents and workflow operations.

## Agent Behavior Constraints

### Ambiguity Handling
- **NEVER assume defaults** for ambiguous requests
- **Always ask ONE clarifying question at a time** when information is missing
- Queue additional questions for after the first is resolved
- Move forward only when sufficient information is gathered

### One-Question-at-a-Time Rule
- Enrichment agent asks exactly ONE question per response
- Provide 2-4 specific options when possible
- Maximum 3-4 questions total per workflow creation
- Stop asking when you have enough to create a working workflow

### Non-Interruptive UX
- **Never force context switching** to external pages during chat
- Provide **optional buttons** for credential setup (don't block workflow creation)
- Allow users to create workflows without credentials (warn about requirement)
- Guidance runs in parallel to main task completion

---

## n8n Workflow Constraints

### Credential Handling
- **NEVER access or store actual credential values** (API keys, passwords, tokens)
- Only reference credential **types** (e.g., "slackApi", "googleOAuth2")
- Only check credential **presence** by ID or name
- LLM agents never receive credential values, only references
- Let users set up credentials manually in n8n UI

### Workflow Structure
- Node IDs must be unique within a workflow
- Node types must exist in n8n (use only documented nodes)
- Connections must reference valid node IDs
- All required node parameters must be provided
- Position nodes with ~200px horizontal spacing

### API Operations
- Use n8n API v1 endpoints
- Authenticate with API key (X-N8N-API-KEY header)
- Never bypass browser security (CORS, CSP)
- Validate all API responses before processing
- Handle rate limits and timeouts gracefully

---

## Security Constraints

### Data Privacy
- No personal data collection
- No usage tracking or analytics
- No external data transmission (except API calls to n8n and LLM)
- All data stays on user's machine
- Chat history not persisted (session only)

### Storage
- Use `chrome.storage.local` for API keys (encrypted by browser)
- Never use `localStorage` for sensitive data
- Never expose API keys in console logs or error messages
- Clear sensitive data when panel closes

### Network
- HTTPS only for all API calls
- Validate SSL certificates
- Sanitize all user inputs before API calls
- Validate API responses before processing

---

## Output Format Constraints

### JSON Responses
When agents return structured data, use valid JSON:
```json
{
  "status": "SUCCESS | ERROR | NEEDS_MORE_INFO",
  "data": { /* structured data */ },
  "message": "Human-readable message"
}
```

### Markdown Responses
When providing user-facing text, use markdown:
- Headings for structure
- Code blocks for technical content
- Lists for steps or options
- Bold for emphasis
- Links for external resources

### Error Messages
- **Clear**: Use plain language, avoid technical jargon
- **Actionable**: Tell users what they can do to resolve
- **Context-Aware**: Provide relevant context for the error
- **Non-Blocking**: Don't prevent users from continuing their work

---

## LLM Integration Constraints

### Token Limits
- Keep system prompts under 4,000 tokens
- Keep agent responses under 1,000 tokens
- Use streaming for long responses
- Truncate long histories if needed

### Response Time
- Target < 5 seconds for workflow creation plans
- Use streaming to show progress
- Provide "thinking" indicators for long operations
- Allow users to cancel long-running operations

### Provider Compatibility
- Design prompts to work with GPT-4, GPT-5, Claude, Gemini
- Avoid provider-specific features
- Use standard JSON output format
- Test prompts across providers

---

## Workflow Creation Rules

### Simplicity First
- Create the simplest workflow that meets requirements
- Don't add unnecessary nodes or complexity
- Use linear flow when possible
- Split complex workflows into multiple workflows

### Node Selection Priority
1. **Native n8n nodes** first (Slack, Gmail, etc.)
2. **HTTP Request** for APIs without native nodes
3. **Code node** only when transformation is complex
4. **Webhook** for external triggers

### Common Requirements
Always include in workflows when relevant:
- **Error handling**: For production workflows
- **Logging**: For debugging and monitoring
- **Clear naming**: Descriptive workflow and node names
- **Documentation**: In workflow description field

---

## Agent Escalation Rules

### When to Ask for Clarification
- User request is vague or ambiguous
- Multiple valid interpretations exist
- Critical information is missing (trigger type, action, service)
- User's intent is unclear

### When to Proceed Without Asking
- User has provided complete information
- Sensible defaults exist and are documented
- Request is clear and straightforward
- User seems frustrated with questions

### When to Suggest Alternatives
- Requested node/service doesn't exist in n8n
- Better approach exists for user's goal
- User's approach has known issues
- Simpler solution is available

---

## Development & Debugging Constraints

### Logging
- Log errors locally (never transmit)
- Sanitize logs to remove sensitive data
- Provide debug mode for development
- Include request/response IDs for tracing

### Testing
- Test all workflows before suggesting to users
- Validate node configurations
- Check credential requirements
- Verify connections are valid

### Error Recovery
- Retry transient failures with exponential backoff
- Provide clear error messages
- Suggest fixes for common errors
- Allow manual retry

---

## User Experience Rules

### Conversation Flow
- Start each session with LLM-generated greeting
- Maintain conversational tone
- Acknowledge user input before processing
- Confirm actions before executing
- Provide progress updates for long operations

### Feedback
- Show success confirmations
- Explain what happened and why
- Provide next steps after actions
- Link to relevant documentation

### Accessibility
- Use clear, plain language
- Provide alternative text for visual elements
- Support keyboard navigation
- Don't rely solely on color for meaning

---

## Exceptions and Overrides

### When Constraints Can Be Relaxed
- **User explicitly requests** deviation
- **Testing and development** mode
- **Documented edge case** exists
- **User is experienced** and knows implications

### When Constraints Cannot Be Relaxed
- **Security**: Never compromise user data or credentials
- **Privacy**: Never collect personal data
- **API limits**: Never bypass rate limits or quotas
- **Browser security**: Never bypass CORS or CSP

---

## Version and Compatibility

### n8n Versions
- Target n8n 1.0+ for MVP
- Support latest stable version
- Warn about deprecated nodes
- Provide migration path for breaking changes

### Browser Support
- Chrome/Chromium 120+
- Edge 120+
- No Firefox support in MVP (manifest v3 differences)

### API Versions
- n8n API: v1
- OpenAI: Latest stable (gpt-4o, gpt-4o-mini)
- Future: Support for Anthropic, Gemini, local models

