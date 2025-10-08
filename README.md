# n8n Pro Extension

> AI-powered Chrome extension for intelligent n8n workflow creation and management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## TLDR

A browser extension that injects an AI-powered chatbot into your n8n instance. Create, optimize, and manage workflows through natural language conversations. No context switching required.

**Key Features:**
- 🤖 AI-powered workflow creation via chat interface
- 📝 Natural language workflow planning
- 🔐 Credential detection and setup guidance
- ⚡ Real-time workflow preview before applying
- 🎯 Non-interruptive UX with optional actions
- 🔒 Local-first: all data stays on your machine

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

### Prerequisites

- **Chrome/Edge Browser** (Manifest V3 support)
- **Node.js 22** or later
- **yarn** package manager
- **n8n instance** (local or cloud) with API access

### Build from Source

```bash
# Clone the repository
git clone <repository-url>
cd n8n-pro

# Install dependencies
cd extension
yarn install

# Build the extension
yarn build

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select extension/dist folder
```

---

## Quick Start

### 1. Configure API Keys

1. Click the extension icon → **Options**
2. Enter your **OpenAI API key** (get from [OpenAI Platform](https://platform.openai.com/api-keys))
3. Enter your **n8n Base URL** (e.g., `http://localhost:5678`)
4. Enter your **n8n API key** (create in n8n Settings → API)
5. Click **Save**

### 2. Start Using

1. Navigate to your n8n instance
2. Click the floating **trigger button** that appears
3. Chat with the AI to create workflows:

```
"Create a workflow that sends me a Slack message every morning at 9 AM"
```

4. Review the generated plan
5. Click **Apply** to create the workflow in n8n
6. Follow credential setup guidance if needed

---

## Features

### 🤖 AI-Powered Workflow Creation

- **Natural Language**: Describe what you want in plain English
- **Context Aware**: Understands n8n nodes, credentials, and patterns
- **Smart Planning**: Generates optimized workflow plans
- **One-Question-at-a-Time**: Asks clarifying questions when needed

### 📝 Workflow Management

- **Create**: Build new workflows from scratch
- **Read**: Analyze existing workflows
- **Update**: Modify and improve workflows (planned)
- **Credentials**: Detect and guide credential setup

### 🎯 Non-Interruptive UX

- **Optional Actions**: Never blocks your workflow
- **Deep Linking**: Direct links to workflow and credential pages
- **In-Panel Preview**: Review plans before applying
- **Expandable Details**: Credential info when you need it

### 🔒 Privacy & Security

- **Local First**: All data stays on your machine
- **No Tracking**: No analytics or telemetry
- **Secure Storage**: API keys encrypted by browser
- **No Credential Access**: Never touches actual credential values

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   Content    │◄────►│  Background  │                   │
│  │   Script     │      │   Worker     │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                      │                            │
│         │                      ├──► OpenAI API             │
│         │                      ├──► n8n API                │
│         │                      └──► Orchestrator           │
│         │                                                   │
│  ┌──────────────┐                                          │
│  │  Chat Panel  │                                          │
│  │  (React UI)  │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### Content Script
- Detects n8n pages
- Injects trigger button and chat panel
- Manages UI state and messaging

#### Background Worker
- Handles API communication (OpenAI + n8n)
- Orchestrates AI agents
- Manages secure storage

#### Orchestrator
- Classifier: Determines user intent
- Enrichment: Asks clarifying questions
- Planner: Generates workflow plans
- Executor: Applies plans to n8n

#### Chat Panel
- React-based floating panel
- Streaming AI responses
- Plan preview and approval
- Credential guidance

### Key Technologies

- **React 19**: UI components
- **TypeScript**: Type-safe development
- **Vite**: Fast builds and HMR
- **Zustand**: Lightweight state management
- **LangChain**: AI agent orchestration
- **Loom Protocol**: Token-efficient agent communication

---

## Development

### Project Structure

```
extension/
├── src/
│   ├── background/         # Background worker
│   ├── content/            # Content script
│   ├── panel/              # Chat panel UI
│   ├── options/            # Options page
│   └── lib/
│       ├── api/            # API clients
│       ├── orchestrator/   # AI agent orchestration
│       ├── prompts/        # Agent system prompts
│       ├── services/       # Business logic
│       ├── errors/         # Error classes
│       ├── utils/          # Utilities
│       └── types/          # TypeScript types
├── public/                 # Static assets
├── dist/                   # Build output
├── vite.config.ts         # Vite configuration
└── manifest.config.ts     # Extension manifest
```

### Available Scripts

```bash
# Development build with watch mode
yarn watch

# Production build
yarn build

# Lint code
yarn lint

# Clean build artifacts
yarn clean

# Run tests (future)
yarn test
```

### Development Workflow

1. **Make changes** to source files
2. **Build**: `yarn build` or `yarn watch`
3. **Reload extension** in Chrome developer tools
4. **Test** on n8n pages
5. **Check console** for errors or warnings

### Adding New Features

1. Check decision documents in `.cursor/rules/decisions/`
2. Create new decision document if needed
3. Implement feature following coding standards
4. Add tests (when testing infrastructure is ready)
5. Update documentation

---

## Testing

See [TESTING-GUIDE.md](TESTING-GUIDE.md) for comprehensive testing procedures.

### Quick Test

```bash
# 1. Start n8n
docker run -it --rm -p 5678:5678 n8nio/n8n

# 2. Build extension
cd extension && yarn build

# 3. Load unpacked extension in Chrome

# 4. Configure API keys in Options

# 5. Test workflow creation
# Navigate to localhost:5678
# Click trigger button
# Type: "Create a simple workflow"
```

---

## Contributing

We welcome contributions! Please follow these guidelines:

### Branching Strategy

- `main`: Stable release branch
- `develop`: Development branch
- Feature branches: `✨/feature-name`
- Bug fixes: `🐛/bug-name`

### Commit Convention

Use emoji prefixes for commits:

- ✨ New features
- 🐛 Bug fixes
- ♻️ Refactoring
- 📚 Documentation
- 🔧 Configuration
- ⚡ Performance
- 🔐 Security

Example: `✨ Add workflow template support`

### Pull Request Process

1. Fork the repository
2. Create feature branch
3. Make changes with clear commits
4. Update documentation
5. Test thoroughly
6. Submit PR with description

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Roadmap

### MVP (Current Phase)

- [x] Basic chatbot interface
- [x] AI-powered workflow creation
- [x] Credential detection and guidance
- [x] Error handling and logging
- [ ] Markdown rendering in chat
- [ ] Security review
- [ ] Performance optimization

### Phase 2 (Planned)

- [ ] Workflow optimization
- [ ] Complex workflow creation
- [ ] Visual diff preview
- [ ] Workflow suggestions

### Phase 3 (Future)

- [ ] Multiple LLM providers
- [ ] Advanced credential management
- [ ] Team collaboration
- [ ] Workflow analytics

---

## Support

- **Issues**: [GitHub Issues](<repository-url>/issues)
- **Documentation**: [Decision Documents](.cursor/rules/decisions/)
- **Testing**: [Testing Guide](TESTING-GUIDE.md)

---

## Acknowledgments

- **n8n**: For the amazing workflow automation platform
- **OpenAI**: For GPT models powering the AI features
- **LangChain**: For agent orchestration framework

---

**Made with ❤️ for the n8n community**
