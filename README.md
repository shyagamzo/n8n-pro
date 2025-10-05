# n8n AI Assistant

AI-powered Chrome/Edge extension for n8n workflow assistance.

## Overview

This extension provides an intelligent chatbot interface that helps users create, optimize, and manage n8n workflows through natural language interactions.

## Features

- **AI-Powered Workflow Creation**: Describe your workflow in natural language and let AI create it
- **Workflow Optimization**: Get suggestions for improving existing workflows
- **Non-Interruptive UX**: Optional guidance that doesn't block your workflow
- **n8n Integration**: Seamless integration with your n8n instance

## Development

### Prerequisites

- Node.js 22+
- yarn
- Chrome/Edge browser
- n8n instance (local or cloud)

### Setup

```bash
# Install dependencies
yarn install

# Development mode
yarn dev

# Build for production
yarn build

# Watch mode (auto-rebuild on changes)
yarn watch

# Lint code
yarn lint
```

### Development Workflow

For active development, use the watch mode:

```bash
# Start watch mode (recommended for development)
yarn watch

# Or use the enhanced watch script with better output
yarn watch:script
```

The watch mode will:
- Automatically rebuild the extension when you save files
- Handle TypeScript compilation through Vite
- Show colored output for easy debugging
- Copy manifest.json to the dist folder automatically

### Project Structure

```
src/
├── background/          # Service worker (orchestration)
├── content/            # Content scripts (injection)
├── panel/              # React panel UI
├── options/            # Settings page
└── lib/                # Shared utilities
    ├── api/           # API clients
    ├── agents/        # AI agents
    ├── components/    # Shared components
    ├── services/      # Business services
    ├── models/        # Data models
    ├── utils/         # Utilities
    └── types/         # TypeScript types
```

## Installation

1. Build the extension: `yarn build`
2. Open Chrome/Edge and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

## Configuration

1. Click the extension icon and select "Options"
2. Enter your n8n instance URL (e.g., `http://localhost:5678`)
3. Add your n8n API key
4. Add your OpenAI API key for AI features

## Usage

1. Navigate to your n8n instance
2. Click the extension icon to open the AI assistant
3. Describe what you want to do in natural language
4. The AI will help create or optimize your workflows

## Architecture

The extension uses a multi-agent architecture:

- **Classifier**: Determines the type of request
- **Enrichment**: Gathers additional context
- **Planner**: Creates execution plans
- **Executor**: Performs the actual workflow operations

## Contributing

See our [development guidelines](decisions/) for coding standards and architecture decisions.

## License

MIT
