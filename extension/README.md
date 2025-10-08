# n8n Pro Extension

An AI-powered Chrome extension that helps you create n8n workflows through natural conversation. Simply describe what you want to automate, and the extension will generate and deploy the workflow for you.

## Features

- 🤖 **AI-Powered Workflow Creation**: Describe your automation needs in plain English
- 🔄 **Real-time Planning**: Get instant workflow plans with visual previews
- 🔐 **Credential Management**: Automatic detection of available n8n credentials
- 🎨 **n8n Design Integration**: Seamlessly integrated with n8n's UI
- 📝 **Markdown Support**: Rich text responses with code highlighting
- 🛡️ **Secure**: API keys stored locally, no data sent to third parties

## Quick Start

### Prerequisites

1. **n8n Instance**: Running locally or in the cloud
2. **API Keys**: 
   - OpenAI API key for AI functionality
   - n8n API key for workflow management

### Installation

1. **Build the Extension**
   ```bash
   cd extension
   yarn install
   yarn build
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

3. **Configure Settings**
   - Click the extension icon → Options
   - Enter your OpenAI API key
   - Enter your n8n Base URL (e.g., `http://localhost:5678`)
   - Enter your n8n API key
   - Click Save

### Usage

1. Navigate to your n8n instance
2. Click the extension trigger button
3. Describe what you want to automate
4. Review the generated workflow plan
5. Click "Apply" to create the workflow

## Example Conversations

**Simple Automation:**
> "Create a workflow that sends me a Slack message every morning at 9 AM"

**Complex Workflow:**
> "I want to automate form submissions. When someone submits a contact form, validate the email, save to Google Sheets, and send a confirmation email."

**Multi-step Process:**
> "I need to automate my sales process. When a new lead comes in via webhook, check if they're in our CRM, if not add them, then send a welcome email and notify the sales team on Slack."

## Architecture

### Core Components

- **Content Script**: Injects UI into n8n pages
- **Background Service**: Handles AI processing and n8n API calls
- **Options Page**: Settings and API key management
- **Orchestrator**: AI agent coordination and workflow planning

### AI Agents

- **Classifier**: Determines user intent and conversation state
- **Enrichment**: Gathers additional requirements through questions
- **Planner**: Generates workflow plans using Loom protocol
- **Executor**: Applies plans to n8n via API

### Loom Protocol

A token-efficient format for inter-agent communication that enables:
- Structured workflow representation
- Credential requirement tracking
- Validation and error handling
- Human-readable plan previews

## Development

### Project Structure

```
extension/
├── src/
│   ├── background/          # Service worker
│   ├── content/             # Content script injection
│   ├── options/             # Settings page
│   ├── panel/               # Chat interface
│   └── lib/
│       ├── ai/              # AI model integration
│       ├── api/             # External API clients
│       ├── components/      # Reusable UI components
│       ├── loom/            # Loom protocol implementation
│       ├── n8n/             # n8n API client
│       ├── orchestrator/    # AI agent coordination
│       ├── prompts/         # Agent system prompts
│       ├── services/        # Core services
│       ├── state/           # State management
│       ├── types/           # TypeScript definitions
│       └── utils/           # Utility functions
├── public/                  # Static assets
└── manifest.config.ts       # Extension configuration
```

### Building

```bash
# Development
yarn dev

# Production build
yarn build

# Linting
yarn lint
```

### Testing

See [TESTING-GUIDE.md](../TESTING-GUIDE.md) for comprehensive testing procedures.

## Configuration

### Environment Variables

The extension uses Chrome storage for configuration:

- `openaiApiKey`: Your OpenAI API key
- `n8nBaseUrl`: Your n8n instance URL
- `n8nApiKey`: Your n8n API key

### n8n Setup

1. **Enable API Access**
   - Go to Settings → API
   - Create a new API key
   - Copy the key for extension configuration

2. **Configure Credentials**
   - Set up credentials for services you want to use
   - The extension will detect available credentials
   - Missing credentials will be highlighted in workflow plans

## Troubleshooting

### Common Issues

**Extension not loading:**
- Check that n8n is running on the configured URL
- Verify API keys are correct
- Check browser console for errors

**Workflow creation fails:**
- Ensure n8n API key has proper permissions
- Check that required credentials are set up
- Verify workflow structure in browser console

**AI responses not working:**
- Verify OpenAI API key is valid
- Check API usage limits
- Ensure internet connection is stable

### Debug Mode

Enable verbose logging:
```javascript
localStorage.debug = 'n8n:*'
```

## Security

- API keys are stored locally in Chrome storage
- No data is sent to third parties except OpenAI
- All user data remains in your browser
- Workflows are created directly in your n8n instance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: Report bugs via GitHub issues
- **Documentation**: Check the docs folder
- **Testing**: Follow the testing guide for validation

---

**Current Version**: 0.0.0  
**Status**: MVP Phase - Milestone 1.5 (Testing & Polish)  
**Next Milestone**: Enhanced Features (Phase 2)