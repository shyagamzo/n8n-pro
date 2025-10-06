# Decision Record: n8n Extension API Integration Strategy

## API Version
Use n8n's latest REST API (v2) for MVP integration.

## Core Operations (MVP)
- **Workflows**: List, create, read, update, delete workflows
- **Nodes**: Create, update, delete nodes within workflows
- **Connections**: Create and manage node connections
- **Credentials**: List existing credentials (presence check only)
- **Executions**: Read execution status and results

## Authentication
- API Key authentication via n8n's REST API
- Store API key securely in extension storage
- Support for both self-hosted and n8n Cloud instances

## Data Flow
1. **Panel Open**: Auto-fetch list of existing workflows
2. **Workflow Creation**: Create new workflows with nodes and connections
3. **Workflow Updates**: Apply diffs to existing workflows
4. **Credential Check**: Verify required credentials exist before execution
5. **Execution Monitoring**: Track workflow execution status

## Error Handling
- Graceful handling of API rate limits
- Retry logic for transient failures
- Clear error messages for credential/auth issues
- Fallback for network connectivity issues

## Security Considerations
- Never store or transmit credential values
- Only check credential presence/metadata
- Validate API responses before processing
- Sanitize user inputs before API calls

## API Client Implementation
- Custom fetch wrapper around native fetch function
- Tailored to extension scenarios (CORS, error handling, retries)
- TypeScript-first with proper error types
- Built-in retry logic and rate limiting handling

### Key Features
- **Automatic retry**: Exponential backoff for transient failures
- **Request/response logging**: Debug logging for development and troubleshooting
- **Timeout handling**: Configurable timeouts for different operation types
- **CORS preflight management**: Handle cross-origin requests properly
- **Error classification**: Distinguish between network, auth, and API errors
- **Rate limiting**: Respect n8n API rate limits with backoff

## Integration Points
- Background service worker handles API calls
- Content script provides n8n instance detection
- Panel UI displays API status and results
- Options page manages API key configuration

## Reference Documentation
- n8n API docs: https://docs.n8n.io/api/
- Self-hosting guide: https://docs.n8n.io/hosting/
- Authentication: https://docs.n8n.io/api/authentication/

## Open Items
- Specific API endpoints for each operation
- Rate limiting and retry strategies
- API version compatibility matrix
