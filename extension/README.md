# n8n Pro Extension

A Chrome/Edge browser extension that adds AI-powered workflow creation and optimization capabilities to n8n instances.

## Features

- 🤖 **AI-Powered Workflow Creation**: Create n8n workflows using natural language
- 🎯 **Intelligent Planning**: LLM-driven workflow planning with credential detection
- 🔄 **Workflow Optimization**: Improve existing workflows for better performance
- 🔐 **Credential Guidance**: Non-interruptive setup assistance for missing credentials
- 💬 **Conversational Interface**: Chat-based interaction for workflow management
- 🎨 **Native Design Integration**: Seamlessly integrates with n8n's design system

## Architecture

### Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7 with @crxjs/vite-plugin
- **State Management**: Zustand 5
- **AI/LLM**: LangChain 0.3 + LangGraph + OpenAI
- **Validation**: Zod for runtime type checking
- **Extension**: Manifest V3

### Project Structure

```
extension/
├── src/
│   ├── background/          # Service worker (background script)
│   ├── content/             # Content script (injected into n8n pages)
│   ├── panel/               # Floating chat panel UI
│   ├── options/             # Extension options page
│   └── lib/
│       ├── ai/              # OpenAI integration
│       ├── api/             # Fetch wrapper with retry logic
│       ├── cache/           # Memory cache with TTL
│       ├── logger/          # Centralized logging with sanitization
│       ├── loom/            # Loom protocol (inter-agent communication)
│       ├── n8n/             # n8n API client
│       ├── orchestrator/    # Multi-agent orchestration
│       ├── prompts/         # LLM system prompts
│       ├── services/        # Core services (chat, messaging, settings)
│       ├── state/           # Zustand stores
│       ├── types/           # TypeScript type definitions
│       ├── validation/      # Zod schemas and type guards
│       └── utils/           # Utility functions
├── public/                  # Static assets
├── manifest.config.ts       # Extension manifest configuration
├── vite.config.ts          # Vite build configuration
└── package.json            # Dependencies and scripts
```

## Installation

### Prerequisites

- Node.js 22 (latest LTS)
- npm or yarn
- Chrome or Edge browser
- Local n8n instance (http://127.0.0.1:5678)

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd extension
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

4. **Load in browser**:
   - Open Chrome/Edge and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

### Development Mode

For hot-reload during development:

```bash
npm run dev
```

This starts the Vite dev server and watches for file changes.

## Configuration

### API Keys Setup

1. Click the extension icon in your browser
2. Go to "Options"
3. Configure:
   - **OpenAI API Key**: Your OpenAI API key (sk-...)
   - **n8n API Key**: Your n8n API key
   - **n8n Base URL**: Default is `http://127.0.0.1:5678`

API keys are stored securely in `chrome.storage.local` and only accessible to the background worker.

### n8n API Key

To get your n8n API key:

1. Open your n8n instance
2. Go to Settings → API
3. Generate a new API key
4. Copy and paste into the extension options

## Usage

### Creating Workflows

1. Navigate to your n8n instance
2. Click the floating chat button (bottom-right)
3. Describe the workflow you want to create
4. Review the generated plan
5. Click "Apply" to create the workflow

### Example Prompts

- "Create a workflow that sends me an email every morning at 9am with weather forecast"
- "Build a workflow that monitors my GitHub repo for new issues and posts them to Slack"
- "Make a workflow that backs up my database to Google Drive daily"

## Infrastructure Components

### Data Validation

The extension uses Zod for runtime type checking:

```typescript
import { validateWorkflowsList } from './lib/validation'

// Validate API response
const workflows = validateWorkflowsList(response)
```

### Retry Logic

API calls automatically retry on transient failures:

```typescript
import { apiFetch } from './lib/api/fetch'

// GET requests retry automatically
const data = await apiFetch('/api/v1/workflows')

// POST requests require explicit retry
const result = await apiFetch('/api/v1/workflows', {
  method: 'POST',
  body: workflow,
  retry: true, // Enable retry for non-idempotent operations
})
```

### Caching

Memory cache with TTL for API responses:

```typescript
import { MemoryCache } from './lib/cache'

const cache = new MemoryCache({ defaultTTL: 5 * 60 * 1000 })

// Cache API response
await cache.getOrSet('workflows', async () => {
  return apiFetch('/api/v1/workflows')
})
```

### Logging

Centralized logger with automatic sanitization:

```typescript
import { logger } from './lib/logger'

logger.info('Workflow created', { workflowId: 'abc123' })
logger.error('API call failed', error, { endpoint: '/api/workflows' })
```

Sensitive data (API keys, tokens, passwords) is automatically redacted from logs.

## Security

### Data Handling

- **Local-only**: All data stays on your machine
- **No telemetry**: No usage tracking or analytics
- **API key security**: Keys stored in chrome.storage.local (browser-encrypted)
- **Cookie isolation**: API calls use `credentials: 'omit'` to prevent session interference
- **Log sanitization**: Sensitive data automatically redacted from logs

### Permissions

The extension requires minimal permissions:

- `storage`: For API key storage
- `scripting`: For content script injection
- `host_permissions`: Only for localhost n8n instances

### Content Security

- No `eval()` or similar unsafe functions
- Strict TypeScript type checking
- Input validation with Zod schemas
- XSS prevention with DOMPurify

## Development

### Available Scripts

- `npm run dev` - Development mode with hot reload
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Building for Production

```bash
npm run build
```

The built extension will be in `dist/` directory.

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality and consistency checks
- **Validation**: Runtime type checking with Zod
- **Error Handling**: Comprehensive error boundaries and logging

## Architecture Patterns

### Multi-Agent System

The extension uses a multi-agent architecture:

1. **Classifier Agent**: Determines user intent
2. **Enrichment Agent**: Asks clarifying questions (one at a time)
3. **Planner Agent**: Generates workflow plans
4. **Executor Agent**: Applies plans to n8n

### Loom Protocol

Inter-agent communication uses the Loom protocol:

- Token-efficient structured format
- LLM-friendly syntax
- Validation and parsing utilities

### State Management

- **Zustand**: Lightweight state management for UI
- **chrome.storage**: Persistent storage for settings
- **In-memory cache**: Temporary data caching

## Testing

### Manual Testing

See [TESTING-GUIDE.md](../TESTING-GUIDE.md) for comprehensive testing procedures.

### Test Scenarios

1. Workflow creation with simple triggers
2. Complex workflows with multiple nodes
3. Credential detection and guidance
4. Error handling and recovery
5. API retry logic
6. Cache invalidation

## Troubleshooting

### Extension Not Loading

- Check browser console for errors
- Verify `dist/` folder exists after build
- Ensure manifest.json is valid

### API Calls Failing

- Verify n8n instance is running
- Check n8n base URL in options
- Verify API key is correct
- Check browser console for CORS errors

### Chat Not Responding

- Verify OpenAI API key is set
- Check background worker console (click "service worker" in chrome://extensions)
- Check for API rate limits

### Workflow Creation Failing

- Verify n8n API key has proper permissions
- Check n8n instance version compatibility
- Review workflow plan for errors

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Use descriptive variable names

### Commit Messages

Use emoji prefixes:

- ✨ New features
- 🐛 Bug fixes
- 📚 Documentation
- ♻️ Refactoring
- ⚡ Performance improvements
- 🔧 Configuration changes

### Pull Requests

1. Create feature branch: `✨/feature-name`
2. Make changes with clear commits
3. Update documentation
4. Test thoroughly
5. Submit PR with description

## Resources

### Documentation

- [Development Milestones](../development-milestones.md)
- [Testing Guide](../TESTING-GUIDE.md)
- [Decision Records](./.cursor/rules/decisions/n8n-extension/)
- [Loom Protocol](./src/lib/loom/README.md)
- [Prompt System](./src/lib/prompts/README.md)

### External Links

- [n8n Documentation](https://docs.n8n.io/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/)
- [LangChain Documentation](https://js.langchain.com/)
- [Vite Documentation](https://vitejs.dev/)

## License

[Add license information]

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

**Current Status**: MVP Phase - Milestone 1.5 (Testing & Polish)
