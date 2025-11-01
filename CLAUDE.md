# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**n8n Pro Extension** is a Chrome/Edge Manifest V3 browser extension that provides AI-powered workflow assistance for n8n. It injects a chatbot interface into local n8n instances (localhost:5678), enabling users to create and optimize workflows using natural language.

**Status:** MVP Complete (Phase 1) - Ready for user testing

## Working with Claude Code Agents

**CRITICAL: Always check if there are specialized agents available to delegate tasks and questions to before performing them yourself.**

This project has multiple specialized agents configured in Claude Code:
- **reactive-system-architect** - Event system, RxJS streams, event bus architecture
- **ux-guardian** - UI/UX implementation, animations, user feedback
- **error-infrastructure-architect** - Error handling infrastructure, event-driven error propagation
- **agent-architect** - Multi-agent infrastructure, LangGraph workflows, orchestrator routing
- **root-cause-enforcer** - Reviewing bug fixes to ensure root causes are addressed
- **project-documentor** - Documentation creation, architecture decisions, knowledge persistence
- **Explore** - Fast codebase exploration and search

**Delegation Protocol:**
1. **Before starting any task**, consider if a specialized agent should handle it
2. **For complex decisions**, brainstorm with multiple agents in parallel to gather different perspectives
3. **For architectural changes**, always consult the relevant specialist agent
4. **For implementation work**, delegate to the appropriate domain expert

**Examples:**
- UI changes → Use ux-guardian agent
- Event system modifications → Use reactive-system-architect agent
- Bug fixes → Use root-cause-enforcer agent after fix
- Codebase exploration → Use Explore agent
- New agent development → Use agent-architect agent
- Documentation updates → Use project-documentor agent after significant changes

## Core Architecture

### Multi-Agent System with Reactive Events

The extension uses a **multi-agent architecture** powered by LangGraph with a **reactive event-driven system** using RxJS for internal coordination.

**Agent Flow:**
```
START → orchestrator (routing hub)
  ├─→ enrichment (gather requirements) → orchestrator
  ├─→ planner (create plan) → orchestrator
  ├─→ validator (validate plan) → orchestrator
  ├─→ executor (create workflow) → orchestrator
  └─→ END (workflow created)
```

**Key Architectural Components:**
- **Orchestrator** (`extension/src/ai/orchestrator/`): Pure routing function with explicit state machine
- **Loom Protocol** (`extension/src/loom/`): Token-efficient (40-60% savings), indentation-based format for agent communication
- **Event Bus** (`extension/src/events/`): RxJS-based central event system with domain streams (workflow$, agent$, error$, etc.)
- **Reactive Subscribers** (`extension/src/events/subscribers/`): Self-contained modules for logging, chat updates, persistence, tracing
- **n8n Client** (`extension/src/n8n/`): Hardcoded node types extracted from n8n source (436+ nodes) - no runtime API calls needed

### Extension Entry Points

- **Content Script** (`extension/src/entries/content/`): Injects chat UI trigger button into n8n pages
- **Background Worker** (`extension/src/entries/background/`): Service worker for AI orchestration and message routing
- **Options Page** (`extension/src/entries/options/`): Settings page for API key configuration

## Development Commands

### Extension Development
```bash
cd extension
yarn dev      # Development mode with HMR (hot module reload)
yarn build    # Production build → extension/dist/
yarn lint     # Run ESLint
yarn preview  # Preview production build
```

### Testing
```bash
# Root level - Playwright tests (initialized but minimal)
npx playwright test
npx playwright show-report

# Manual testing guide: TESTING-GUIDE.md
```

### Node Type Regeneration
```bash
# Regenerate hardcoded n8n node types from source
node scripts/extract-n8n-nodes.js
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript 5.9** - Strict mode enabled
- **Vite 7** - Build tool with HMR
- **Zustand 5** - State management with chrome.storage.local persistence
- **RxJS 7.8** - Reactive event system
- **LangChain 0.3 + LangGraph 0.4** - Multi-agent workflow orchestration
- **OpenAI gpt-4o-mini** - LLM provider
- **@crxjs/vite-plugin** - Chrome extension build plugin

## Code Quality Standards

### Type Safety - NEVER BYPASS

**Critical Rules:**
- ❌ **NEVER** use `any`
- ❌ **NEVER** use `@typescript-eslint/no-explicit-any`
- ❌ **NEVER** use `as any`
- ✅ Use method chaining for type inference
- ✅ Import and reuse existing types

### Simplicity-First Principle

1. Start simple, add complexity only when proven necessary
2. Question every line: "Is this necessary?"
3. **Three strikes rule** for abstractions - wait for 3 duplications before abstracting
4. Avoid premature optimization

### Positive Path First Pattern

```typescript
// ✅ CORRECT - Positive path first
if (parsed.success && parsed.data) {
  return { success: true, plan: parsed.data }
}
return { success: false, errors }

// ❌ WRONG - Negative path first
if (!parsed.success || !parsed.data) {
  return { success: false, errors }
}
return { success: true, plan: parsed.data }
```

### File Organization

**Standard Structure:**
1. Imports (Low-level → Framework → Third-party → Internal)
2. Constants
3. Types
4. Main code
5. Helper functions

**Section Headers:**
```typescript
// ─────────────────────────────────────────────────────────────
// Section Name
// ─────────────────────────────────────────────────────────────
```

**Vertical Spacing:**
- Group related variable declarations
- Empty line after variable group
- Empty line before return statement (except when only statement)
- Empty line between distinct logical operations

### Complexity Thresholds

- **Functions:** 5-20 lines ideal, 50+ requires refactor
- **Conditionals:** 1-2 levels ideal, 4+ requires refactor
- **Files:** <200 lines ideal, 400+ requires split

## Architectural Patterns

### Event System Usage

**DO:**
- Emit events via helper functions (`emitters.ts`)
- Let subscribers handle cross-cutting concerns (logging, persistence, UI updates)
- Use domain streams for filtering (workflow$, agent$, error$, etc.)

**DON'T:**
- Manually log in orchestrator nodes (LangGraph bridge auto-captures events)
- Update UI directly from services (emit events instead)
- Bypass event system for coordination

### Separation of Concerns

**Clear boundaries:**
- **Logic vs View**: Business logic in services, UI in components
- **Data vs Behavior**: State in Zustand, actions in services
- **API vs Implementation**: n8n client abstracts API calls
- **Domain boundaries**: Each directory is a domain (ai/, n8n/, events/, ui/)

### State Management

**Zustand Store** (`extension/src/ui/chatStore.ts`):
- Single source of truth for chat state
- Persisted to `chrome.storage.local` (browser-encrypted)
- Session persistence across page reloads

**DO:**
- Keep store focused on UI state
- Use selectors for derived state
- Persist only necessary data

**DON'T:**
- Store sensitive data (API keys go in chrome.storage.local directly)
- Duplicate state across multiple stores
- Use store for temporary component state

## Path Aliases

Configured in `vite.config.ts` and `tsconfig.app.json`:

```typescript
@ui        → extension/src/ui
@ai        → extension/src/ai
@n8n       → extension/src/n8n
@platform  → extension/src/platform
@events    → extension/src/events
@shared    → extension/src/shared
@loom      → extension/src/loom
@services  → extension/src/services
```

## Git Workflow

### Branch Naming
- Features: `✨/feature-name`
- Bug Fixes: `🐛/bug-description`
- Releases: `🚀/version-number`
- Hotfixes: `🔥/critical-fix`

**Current Branch:** `✅/agents/verify-infrastructure`
**Main Branch:** `master`

### Commit Emojis
- 🤖 AI instructions, automation
- 💭 Decisions, planning
- ✨ New features
- 🐛 Bug fixes
- 📚 Documentation
- 🎨 Code style
- ♻️ Refactoring
- ⚡ Performance
- 🔧 Configuration

## Security & Performance

### Security (5/5 Rating)
- API keys stored in `chrome.storage.local` (browser-encrypted, never localStorage)
- No external data transmission except OpenAI/n8n APIs
- Credential references only (never actual values)
- DOMPurify for XSS protection
- All user input validated before LLM

### Performance (5/5 Rating)
- Extension load time: <2 seconds
- API response time: <5 seconds for workflow creation
- Memory usage: <100MB footprint
- Streaming responses for real-time feedback
- Token-efficient Loom protocol

## Documentation Architecture

### Primary Files
- `README.md` - Project overview, quick start
- `TESTING-GUIDE.md` - Comprehensive manual testing procedures
- `WORKFLOW-DEBUG-GUIDE.md` - Debugging workflow creation
- `development-milestones.md` - Project roadmap

### Cursor Rules (`.cursor/rules/`)
- **65 Architecture Decision Records** in `decisions/n8n-extension/` (organized by domain: api, architecture, dev-workflow, governance, security, state-management, testing, ux)
- **18 Universal Development Standards** in `universal/dev-rules/`
- **Consult these before making architectural changes**

### Module Documentation
- `/extension/src/loom/README.md` - Loom protocol spec
- `/extension/src/n8n/README.md` - n8n integration details
- `/extension/src/events/README.md` - Event system architecture
- `/extension/src/ai/prompts/README.md` - Prompt library

## Common Pitfalls to Avoid

❌ Manual logging in orchestrator nodes (use LangGraph bridge)
❌ Bypassing TypeScript with `any` (fix types properly)
❌ Direct UI updates from services (emit events instead)
❌ Premature abstraction (wait for 3 duplications)
❌ Complex conditionals in orchestrator (use explicit state machine)
❌ Large files (split at 400+ lines)
❌ Storing API keys in localStorage (use chrome.storage.local)
❌ Embedding credential values (use references only)

## ESLint Style Rules

- No semicolons
- Single quotes (with escape avoidance)
- Allman brace style
- 120 char line length
- Padding between statement blocks
- Prefer const over let

## Key Integration Points

### n8n Public API
- Workflow CRUD: `/api/v1/workflows`
- Credentials: `/api/v1/credentials`
- Authentication: API key in headers
- Base URL: http://localhost:5678

### OpenAI API
- Model: gpt-4o-mini
- Streaming: SSE for token-by-token responses
- Rate limiting: Handled by LangChain

### Chrome Extension APIs
- `chrome.storage.local` - Settings persistence
- `chrome.runtime` - Messaging between scripts
- `chrome.scripting` - Content script injection

## Current Development Focus

**MVP Complete ✅** - Ready for user testing

**Next Phase:** Enhanced features (workflow optimization, complex workflows, visual diff preview, template library, multiple LLM providers)

## Quick Reference

**Start Development:**
```bash
cd extension && yarn dev
# Load extension/dist in Chrome (Developer mode → Load unpacked)
# Navigate to localhost:5678 in browser
```

**Prerequisites:**
- Node.js 22+
- yarn package manager
- Chrome/Edge browser
- n8n instance running on localhost:5678
- OpenAI API key (configure in extension options page)

**Build for Production:**
```bash
cd extension && yarn build
# Upload extension/dist to Chrome Web Store
```
