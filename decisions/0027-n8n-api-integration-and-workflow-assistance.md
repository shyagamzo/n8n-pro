# Decision Record: n8n API Integration and Workflow Assistance

## Goal
Establish comprehensive n8n API integration patterns and AI-powered workflow assistance capabilities for the extension.

## n8n API Client Strategy
The extension uses a custom API client for n8n integration:

### Key Features
- **Custom fetch wrapper** with retry logic and error handling
- **API key authentication** for secure access
- **Rate limiting** and connection management
- **TypeScript types** for all API responses

### API Endpoints
- **Workflows**: CRUD operations for workflow management
- **Credentials**: Read-only access to credential metadata
- **Executions**: Monitor workflow execution status
- **Health**: Connection testing and status checking

## Workflow Operations Pattern
```typescript
// Get all workflows
const workflows = await n8n.getWorkflows();

// Create new workflow
const newWorkflow = await n8n.createWorkflow({
    name: 'My Workflow',
    nodes: [...],
    connections: [...]
});

// Execute workflow
const execution = await n8n.executeWorkflow(workflowId, inputData);
```

## Page Detection Strategy
The extension automatically detects n8n pages using multiple strategies:

### Detection Methods
- **URL patterns**: `/workflow`, `/workflows`, `/executions`, etc.
- **DOM elements**: `[data-test-id="workflow-canvas"]`, `.workflow-editor`
- **Meta tags**: `<meta name="n8n">`
- **Global variables**: `window.n8n`, `window.workflow`

### Retry Logic
- **Initial detection** on page load
- **Retry after 2 seconds** for dynamic pages
- **Re-check on navigation** events
- **Graceful fallback** for non-n8n pages

## AI Workflow Assistance Capabilities
The AI system can help with:

### Workflow Creation
- **Generate workflow templates** based on user requirements
- **Suggest node configurations** for common use cases
- **Create connections** between nodes
- **Optimize workflow structure**

### Workflow Analysis
- **Identify bottlenecks** and performance issues
- **Suggest improvements** for efficiency
- **Detect common patterns** and anti-patterns
- **Provide debugging assistance**

### Workflow Execution
- **Monitor execution status** in real-time
- **Handle errors** and provide solutions
- **Suggest retry strategies** for failed executions
- **Analyze execution data** and results

## Security Considerations
- **Never expose API keys** in content scripts
- **Validate all user input** before API calls
- **Use HTTPS** for all n8n API communication
- **Implement proper error handling** for API failures
- **Respect rate limits** and implement backoff strategies

## Error Handling Strategy
- **Connection failures**: Retry with exponential backoff
- **Authentication errors**: Prompt user to check API key
- **Rate limiting**: Implement queuing and retry logic
- **Invalid responses**: Validate and sanitize API data
- **Network timeouts**: Provide user feedback and retry options

## Performance Optimization
- **Cache workflow data** to reduce API calls
- **Batch API requests** when possible
- **Use streaming** for large data sets
- **Implement pagination** for large result sets
- **Optimize payload sizes** for faster transmission

## Why This Approach
- **Comprehensive API coverage** enables full workflow management capabilities
- **Multi-strategy page detection** ensures reliable n8n page identification
- **AI-powered assistance** provides intelligent workflow creation and optimization
- **Robust error handling** ensures reliable operation in various scenarios
- **Performance optimization** provides responsive user experience
