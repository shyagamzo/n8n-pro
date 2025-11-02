# n8n Pro Extension

An AI-powered Chrome/Edge extension that provides intelligent workflow assistance for n8n. The extension injects a chatbot interface into your local n8n instance, enabling you to create, optimize, and manage workflows using natural language.

## Features

✨ **AI-Powered Workflow Creation** - Generate complete n8n workflows from natural language descriptions
🤖 **Multi-Agent Architecture** - Intelligent agent system with classification, enrichment, planning, and execution
📝 **Interactive Planning** - Review and approve workflow plans before applying them
🔐 **Credential Guidance** - Non-interruptive guidance for setting up missing credentials
💬 **Streaming Responses** - Real-time AI responses with token streaming
🎨 **n8n Design Integration** - Seamlessly integrates with n8n's native design system
📦 **Session Persistence** - Chat history persisted across page reloads

## Quick Start

### Prerequisites

- **Node.js** 22 or higher (LTS recommended)
- **yarn** package manager
- **Chrome** or **Edge** browser
- **n8n** instance running on `localhost:5678`
- **OpenAI API Key** for LLM functionality

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd n8n-pro
   ```

2. **Install dependencies**
   ```bash
   cd extension
   yarn install
   ```

3. **Build the extension**
   ```bash
   yarn build
   ```

4. **Load in Chrome/Edge**
   - Open `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

5. **Configure API keys**
   - Click the extension icon to open Options
   - Enter your OpenAI API key
   - Enter your n8n API key (found in n8n Settings → API)
   - Set n8n base URL (default: `http://localhost:5678`)
   - Click Save

6. **Start using the assistant**
   - Navigate to your n8n instance (`http://localhost:5678`)
   - Click the "🤖 n8n Assistant" button in the bottom-right corner
   - Start chatting to create workflows!

## Development

### Development Mode

Run the extension in development mode with hot reload:

```bash
cd extension
yarn dev
```

Then load the unpacked extension from `extension/dist` in your browser.

### Project Structure

```
n8n-pro/
├── extension/
│   ├── src/
│   │   ├── background/       # Background service worker
│   │   │   └── index.ts      # Message handling, API calls
│   │   ├── content/          # Content script (injected into n8n)
│   │   │   └── index.ts      # Trigger button injection
│   │   ├── lib/              # Shared libraries
│   │   │   ├── api/          # n8n API client
│   │   │   ├── components/   # Reusable React components
│   │   │   ├── loom/         # Loom protocol for agent communication
│   │   │   ├── orchestrator/ # LangGraph-based orchestrator
│   │   │   ├── prompts/      # Agent system prompts
│   │   │   ├── services/     # Chat and settings services
│   │   │   ├── state/        # Zustand store
│   │   │   ├── types/        # TypeScript definitions
│   │   │   └── utils/        # Utility functions
│   │   ├── options/          # Extension options page
│   │   │   ├── components/   # Options UI components
│   │   │   └── Options.tsx   # Main options page
│   │   └── panel/            # Chat panel UI
│   │       ├── components/   # Panel components
│   │       ├── ChatContainer.tsx
│   │       └── ChatPanel.tsx
│   ├── manifest.config.ts    # Extension manifest
│   ├── vite.config.ts        # Vite configuration
│   └── package.json          # Dependencies
├── .cursor/                  # Cursor rules and decisions
└── development-milestones.md # Project roadmap
```

### Available Scripts

```bash
yarn dev      # Development mode with hot reload
yarn build    # Production build
yarn lint     # Run ESLint
yarn preview  # Preview production build
```

### Tech Stack

- **React** 19 - UI framework
- **TypeScript** 5.9 - Type safety
- **Vite** 7 - Build tool with HMR
- **Zustand** 5 - State management
- **LangChain** 0.3 - AI agent orchestration
- **LangGraph** 0.4 - Multi-agent workflow
- **OpenAI** - LLM provider (gpt-4o-mini)
- **marked** - Markdown rendering
- **DOMPurify** - XSS protection

## Architecture

### Multi-Agent System

The extension uses a sophisticated multi-agent architecture powered by LangGraph:

1. **Classifier Agent** - Determines user intent and routes to appropriate agents
2. **Enrichment Agent** - Gathers missing information one question at a time
3. **Planner Agent** - Generates structured workflow plans using the Loom protocol
4. **Executor Agent** - Applies plans to n8n via REST API

### Loom Protocol

The extension uses a custom **Loom protocol** for efficient agent-to-agent communication:
- Token-efficient structured format
- LLM-friendly syntax
- Validation and parsing utilities
- Full documentation in `extension/src/lib/loom/README.md`

### State Management

Chat state is managed via Zustand store with persistence:
- Messages stored in `chrome.storage.local`
- Session persistence across page reloads
- Reactive updates across components

### Security

- **API Keys** stored securely in `chrome.storage.local` (browser-encrypted)
- **No localStorage** to prevent script access
- **No external data transmission** except to OpenAI/n8n APIs
- **No telemetry or tracking**
- **Credential references only** - never access actual credential values

### Phase 2 Architecture Improvements (2025-11-02)

**Phase 2 introduced type-safe state management and enhanced UX patterns.**

#### Workflow State Machine

Replaced implicit boolean flags (`pendingPlan`, `sending`) with explicit 7-state machine:

```
idle → enrichment → planning → awaiting_approval → executing → completed
                                                             ↘ failed
```

**Benefits:**
- ✅ Explicit state (always know which phase workflow is in)
- ✅ Type-safe transitions (invalid transitions caught at compile-time)
- ✅ Runtime validation (prevents race conditions)
- ✅ Progress feedback (enables ProgressStepper, phase-specific UI)
- ✅ Terminal states (distinguish success vs failure)

**See:** `extension/src/shared/types/workflow-state/README.md`

#### Agent Metadata Registry

Centralized declarative configuration for all agents:

```typescript
import { getAgentMetadata } from '@ai/orchestrator/agent-metadata'

const metadata = getAgentMetadata('planner')
// {
//   displayName: 'Planner',
//   workingMessage: 'Creating workflow plan...',
//   shouldShowTokens: false,
//   shouldCreateMessage: true
// }
```

**Benefits:**
- ✅ Single source of truth (eliminates scattered special cases)
- ✅ Easy to add new agents (1 registry entry)
- ✅ Type-safe (TypeScript strict mode)

**See:** `extension/src/ai/orchestrator/agent-metadata.ts`

#### Enhanced UX Components

**ProgressStepper** - 5-step workflow visualization:
- Hardware-accelerated animations (60fps)
- Responsive (horizontal desktop, vertical mobile)
- WCAG 2.1 AA compliant

**LoadingSpinner** - 3 sizes (sm, md, lg):
- Hardware-accelerated rotation
- Respects `prefers-reduced-motion`

**SkeletonLoader** - 3 variants (plan-message, chat-message, inline-text):
- Shimmer animation
- Zero layout shifts

**See:** `extension/src/ui/feedback/`

#### WCAG 2.1 AA Compliance

Full accessibility compliance achieved:
- ✅ Focus indicators (3px solid outline, 2px offset)
- ✅ Color contrast ≥4.5:1 (updated muted text color)
- ✅ ARIA semantics (proper `role`, `aria-expanded`, `aria-describedby`)
- ✅ Keyboard navigation (logical tab order, auto-focus)
- ✅ Screen reader support (semantic HTML, announcements)

**See:** `extension/PHASE-2-PROGRESS.md` (Week 4 Accessibility Audit)

#### Event-Driven Validation (Development-Only)

Catches coordination bugs during development:
- ✅ Event sequence validation (agents follow proper flow)
- ✅ Graph handoff validation (catch agent → END bugs)
- ✅ Duplicate start validation (prevent state machine bugs)
- ✅ Performance validation (warn on slow workflows >30s)
- ✅ Zero production overhead (stripped from build)

**See:** `extension/src/events/validation/`

#### Migration Guide

**Breaking Changes:** `pendingPlan` removed (use `workflowState` instead)

**See:** `extension/PHASE-2-MIGRATION-GUIDE.md` for full migration details

## Usage Examples

### Create a Simple Workflow

```
You: "Create a workflow that fetches GitHub issues and sends them to Slack"
Assistant: "I'll create a workflow that fetches GitHub issues and posts them to Slack. Let me ask a few questions..."
[... enrichment questions ...]
Assistant: "Here's the workflow plan..." [Shows preview with Apply/Cancel buttons]
```

### Optimize an Existing Workflow

```
You: "Make my 'Daily Report' workflow more efficient"
Assistant: "I'll analyze your workflow and suggest optimizations..."
```

### Get Credential Setup Help

```
Assistant: "This workflow requires GitHub credentials. [Setup Guide ▼]"
[Click to expand]
- Step-by-step setup instructions
- Link to credential settings in n8n
```

## Testing

For comprehensive testing procedures, see [`TESTING-GUIDE.md`](TESTING-GUIDE.md).

### Manual Testing Checklist

1. ✅ Extension loads and injects trigger button
2. ✅ Chat panel opens with AI greeting
3. ✅ Messages send and receive with streaming
4. ✅ Workflow plans display with Apply/Cancel
5. ✅ Workflows create successfully in n8n
6. ✅ Credential guidance appears when needed
7. ✅ Error messages display gracefully
8. ✅ Session persists across reloads

## Troubleshooting

### Extension Not Loading

- Verify Chrome/Edge developer mode is enabled
- Check console for errors
- Rebuild with `yarn build`
- Try removing and re-adding the extension

### Chat Not Responding

- Verify OpenAI API key is set in Options
- Check network tab for API call errors
- Ensure n8n instance is running on `localhost:5678`
- Check browser console for errors

### Workflow Creation Fails

- Verify n8n API key is set correctly
- Check n8n server logs for errors
- Ensure required credentials are set up in n8n
- Verify workflow structure in console debug output

### Common Issues

**"Failed to fetch" error**
- Check n8n is running on localhost:5678
- Verify CORS settings if using custom n8n instance

**"Invalid API key" error**
- Re-enter API key in Options page
- Verify key has not expired
- Check for trailing spaces in key input

**Trigger button not appearing**
- Ensure you're on `http://localhost:5678/*`
- Check content script injection in browser console
- Try reloading the n8n page

## Contributing

We welcome contributions! Please follow these guidelines:

1. Read the decision records in `.cursor/rules/decisions/`
2. Follow the coding standards and conventions
3. Use conventional commits with emojis (see git workflow docs)
4. Test your changes thoroughly
5. Update documentation as needed

### Commit Convention

Use conventional commits with emojis:
- ✨ New features
- 🐛 Bug fixes
- 📚 Documentation
- ♻️ Refactoring
- 🎨 Styling
- ⚡ Performance
- 🔧 Configuration

Example: `✨ Add workflow optimization feature`

## Documentation

- **[Testing Guide](TESTING-GUIDE.md)** - Comprehensive testing procedures
- **[Workflow Debug Guide](WORKFLOW-DEBUG-GUIDE.md)** - Debugging workflow creation
- **[Development Milestones](development-milestones.md)** - Project roadmap
- **[Loom Protocol](extension/src/lib/loom/README.md)** - Agent communication protocol
- **[Prompt Library](extension/src/lib/prompts/README.md)** - Agent system prompts

## Roadmap

See [`development-milestones.md`](development-milestones.md) for the complete roadmap.

### MVP (Phase 1) - Current

- ✅ Extension scaffold and n8n integration
- ✅ Chat interface with streaming responses
- ✅ Multi-agent orchestration
- ✅ Workflow creation and planning
- ✅ Credential detection and guidance
- 🚧 Testing & polish (in progress)

### Phase 2 - Enhanced Features

- Workflow optimization
- Complex multi-step workflows
- Visual diff preview
- Creative workflow suggestions

### Phase 3 - Enterprise

- Multiple LLM providers
- Team collaboration
- Advanced analytics
- SSO integration

## License

[License TBD]

## Support

For issues and questions:
- Check [Troubleshooting](#troubleshooting) section
- Review [TESTING-GUIDE.md](TESTING-GUIDE.md)
- Check browser console for errors
- Review n8n server logs

## Acknowledgments

Built with:
- [n8n](https://n8n.io/) - Workflow automation platform
- [LangChain](https://js.langchain.com/) - LLM orchestration
- [OpenAI](https://openai.com/) - AI capabilities
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool

---

**Current Version**: 0.0.1 (MVP)
**Status**: In active development
**Last Updated**: October 2025
