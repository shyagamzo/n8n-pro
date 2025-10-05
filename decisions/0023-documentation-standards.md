# Decision Record: Documentation Standards

## Documentation Philosophy

### Documentation Principles
- **TLDR First**: Quick overview at the top of every document
- **Progressive Disclosure**: Start simple, add complexity as needed
- **Code Examples**: Show, don't just tell
- **Keep Updated**: Documentation must evolve with code
- **User-Centric**: Write for the person who will use it

### Documentation Types
- **API Documentation**: Function signatures, parameters, return types
- **Architecture Documentation**: System design, component relationships
- **User Documentation**: Setup guides, usage instructions
- **Developer Documentation**: Contributing guidelines, development setup

## Code Documentation

### JSDoc Standards
```typescript
/**
 * Creates a new workflow based on user description
 * 
 * @param description - Natural language description of the workflow
 * @param options - Optional configuration for workflow creation
 * @returns Promise resolving to the created workflow
 * @throws {ValidationError} When description is invalid
 * @throws {ApiError} When n8n API call fails
 * 
 * @example
 * ```typescript
 * const workflow = await createWorkflow('Send email when form submitted');
 * console.log(`Created workflow: ${workflow.name}`);
 * ```
 * 
 * @example
 * ```typescript
 * const workflow = await createWorkflow(
 *     'Process orders from webhook',
 *     { 
 *         triggerType: 'webhook',
 *         includeValidation: true 
 *     }
 * );
 * ```
 */
async function createWorkflow(
    description: string,
    options?: WorkflowOptions
): Promise<Workflow>
{
    // Implementation
}
```

### Interface Documentation
```typescript
/**
 * Configuration options for workflow creation
 */
interface WorkflowOptions
{
    /** Type of trigger to use for the workflow */
    triggerType?: 'webhook' | 'cron' | 'manual';
    
    /** Whether to include data validation nodes */
    includeValidation?: boolean;
    
    /** Custom timeout for workflow execution (in seconds) */
    timeout?: number;
    
    /** Tags to apply to the workflow */
    tags?: string[];
}
```

### Class Documentation
```typescript
/**
 * Manages communication with n8n API
 * 
 * Provides methods for creating, reading, updating, and deleting workflows
 * and credentials. Handles authentication, error handling, and retries.
 * 
 * @example
 * ```typescript
 * const client = new N8nApiClient('http://localhost:5678', 'api-key');
 * const workflows = await client.getWorkflows();
 * ```
 */
export class N8nApiClient
{
    /**
     * Creates a new API client instance
     * 
     * @param baseUrl - Base URL of the n8n instance
     * @param apiKey - API key for authentication
     */
    constructor(
        private baseUrl: string,
        private apiKey: string
    )
    {
        // Implementation
    }

    /**
     * Retrieves all workflows from n8n
     * 
     * @returns Promise resolving to array of workflows
     * @throws {N8nApiError} When API call fails
     */
    async getWorkflows(): Promise<Workflow[]>
    {
        // Implementation
    }
}
```

## README Structure

### Project README
```markdown
# n8n AI Assistant Extension

> AI-powered workflow creation and optimization for n8n

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-org/n8n-ai-extension)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## TLDR

This Chrome/Edge extension adds an AI chatbot to n8n that helps you create and optimize workflows through natural language interaction.

**Quick Start:**
1. Install the extension
2. Configure your OpenAI API key
3. Open n8n and click the AI Assistant button
4. Describe your workflow in natural language

## Features

- 🤖 **AI-Powered Workflow Creation**: Create workflows from natural language descriptions
- 🔧 **Workflow Optimization**: Improve existing workflows with AI suggestions
- 🎯 **Smart Tool Selection**: Automatically choose between simple tools and AI agents
- 🔐 **Credential Guidance**: Step-by-step help for setting up API credentials
- 🎨 **n8n Integration**: Seamless integration with n8n's design system

## Installation

### Prerequisites
- Chrome or Edge browser
- n8n instance (local or cloud)
- OpenAI API key

### Install Extension
1. Download the extension from [Chrome Web Store](#) (coming soon)
2. Enable the extension in your browser
3. Configure your settings (see [Configuration](#configuration))

## Configuration

### Required Settings
- **OpenAI API Key**: Your OpenAI API key for AI functionality
- **n8n API Key**: API key for your n8n instance
- **n8n Base URL**: URL of your n8n instance (default: http://localhost:5678)

### Optional Settings
- **AI Model**: Choose between gpt-4, gpt-3.5-turbo, etc.
- **Theme**: Light, dark, or auto (follows n8n theme)

## Usage

### Creating Workflows
1. Open n8n in your browser
2. Click the "AI Assistant" button in the top-right corner
3. Describe your workflow in natural language
4. Review the generated workflow
5. Click "Apply" to create the workflow

**Example:**
```
User: "Create a workflow that sends an email when a form is submitted"
AI: "I'll create a workflow with a webhook trigger and email node..."
```

### Optimizing Workflows
1. Open an existing workflow in n8n
2. Open the AI Assistant
3. Ask for optimization suggestions
4. Apply the recommended improvements

## Development

### Prerequisites
- Node.js 22+
- yarn
- Chrome/Edge for testing

### Setup
```bash
# Clone the repository
git clone https://github.com/your-org/n8n-ai-extension.git
cd n8n-ai-extension

# Install dependencies
yarn install

# Start development server
yarn dev

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the dist/ folder
```

### Building
```bash
# Build for production
yarn build

# Build and package for store
yarn package
```

## API Reference

### Core Classes
- [`N8nApiClient`](docs/api/n8n-api-client.md) - n8n API communication
- [`WorkflowCreator`](docs/api/workflow-creator.md) - Workflow creation logic
- [`AgentOrchestrator`](docs/api/agent-orchestrator.md) - AI agent coordination

### Types
- [`Workflow`](docs/types/workflow.md) - Workflow data structure
- [`ChatMessage`](docs/types/chat-message.md) - Chat message structure
- [`AgentState`](docs/types/agent-state.md) - AI agent state

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Guidelines
- Follow our [Coding Standards](docs/development/coding-standards.md)
- Write tests for new features
- Update documentation for API changes
- Use conventional commits

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/your-org/n8n-ai-extension/issues)
- 💬 [Discussions](https://github.com/your-org/n8n-ai-extension/discussions)
- 📧 [Email Support](mailto:support@example.com)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.
```

## API Documentation

### API Reference Structure
```
docs/
├── api/
│   ├── n8n-api-client.md
│   ├── workflow-creator.md
│   ├── agent-orchestrator.md
│   └── index.md
├── types/
│   ├── workflow.md
│   ├── chat-message.md
│   └── agent-state.md
├── guides/
│   ├── getting-started.md
│   ├── workflow-creation.md
│   └── troubleshooting.md
└── development/
    ├── coding-standards.md
    ├── testing.md
    └── contributing.md
```

### API Documentation Template
```markdown
# N8nApiClient

> Client for communicating with n8n REST API

## Overview

The `N8nApiClient` class provides a TypeScript interface for interacting with n8n's REST API. It handles authentication, error handling, and provides type-safe methods for workflow and credential management.

## Constructor

```typescript
new N8nApiClient(baseUrl: string, apiKey: string)
```

**Parameters:**
- `baseUrl` - Base URL of the n8n instance (e.g., "http://localhost:5678")
- `apiKey` - API key for authentication

## Methods

### getWorkflows()

Retrieves all workflows from the n8n instance.

```typescript
async getWorkflows(): Promise<Workflow[]>
```

**Returns:** Promise resolving to array of workflows

**Throws:** `N8nApiError` when API call fails

**Example:**
```typescript
const client = new N8nApiClient('http://localhost:5678', 'api-key');
const workflows = await client.getWorkflows();
console.log(`Found ${workflows.length} workflows`);
```

### createWorkflow()

Creates a new workflow in n8n.

```typescript
async createWorkflow(workflow: CreateWorkflowRequest): Promise<Workflow>
```

**Parameters:**
- `workflow` - Workflow creation request

**Returns:** Promise resolving to created workflow

**Throws:** `N8nApiError` when creation fails

**Example:**
```typescript
const workflow = await client.createWorkflow({
    name: 'My Workflow',
    nodes: [
        {
            id: 'webhook',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            position: [100, 100],
            parameters: {}
        }
    ],
    connections: {}
});
```

## Error Handling

The client throws `N8nApiError` for API-related errors:

```typescript
try
{
    const workflows = await client.getWorkflows();
}
catch (error)
{
    if (error instanceof N8nApiError)
    {
        console.error(`API Error: ${error.message} (${error.status})`);
    }
}
```

## See Also

- [Workflow Type](types/workflow.md)
- [Error Handling](guides/error-handling.md)
```

## Inline Documentation

### Component Documentation
```typescript
/**
 * Chat panel component for AI assistant interaction
 * 
 * Displays chat messages, handles user input, and manages
 * streaming AI responses. Integrates with n8n's design system.
 * 
 * @example
 * ```tsx
 * <ChatPanel
 *     messages={messages}
 *     onSendMessage={handleSendMessage}
 *     isStreaming={isStreaming}
 * />
 * ```
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    onSendMessage,
    isStreaming
}) =>
{
    // Implementation
};
```

### Hook Documentation
```typescript
/**
 * Custom hook for managing chat state
 * 
 * Provides chat messages, typing state, and message actions.
 * Automatically handles message persistence and cleanup.
 * 
 * @returns Chat state and actions
 * 
 * @example
 * ```typescript
 * const { messages, addMessage, isTyping } = useChat();
 * 
 * addMessage({
 *     text: 'Hello',
 *     sender: 'user'
 * });
 * ```
 */
export const useChat = (): ChatHookReturn =>
{
    // Implementation
};
```

## Documentation Maintenance

### Documentation Standards
- **Keep Updated**: Update docs when changing APIs
- **Version Control**: Track documentation changes in git
- **Review Process**: Include documentation in code reviews
- **Automated Checks**: Validate documentation in CI/CD

### Documentation Tools
- **TypeDoc**: Generate API documentation from TypeScript
- **Markdown Lint**: Ensure consistent markdown formatting
- **Link Checker**: Validate internal and external links
- **Spell Checker**: Catch typos and spelling errors

## Open Items
- **Interactive Examples**: Add runnable code examples
- **Video Tutorials**: Create video documentation
- **API Explorer**: Interactive API documentation
- **Documentation Analytics**: Track documentation usage
