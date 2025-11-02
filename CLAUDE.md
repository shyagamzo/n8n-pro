# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# ⚠️ **MANDATORY DELEGATION-FIRST WORKFLOW** ⚠️

## **STOP BEFORE EVERY TASK**

**YOU MUST DELEGATE TO SPECIALIZED AGENTS BEFORE IMPLEMENTING ANY CODE OR MAKING ANY DECISIONS.**

### **The Correct Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│  1. ✅ READ the user's request                              │
│  2. ✅ IDENTIFY which specialized agent(s) should handle it │
│  3. ✅ DELEGATE to agent(s) and GET their guidance         │
│  4. ✅ IMPLEMENT based on agent recommendations             │
│                                                              │
│  ❌ NEVER: Implement code first, then mention delegation    │
└─────────────────────────────────────────────────────────────┘
```

### **DO ✅ and DON'T ❌ Examples**

#### ✅ **CORRECT - Delegate BEFORE Implementation**
```
User: "Update the chatStore to integrate workflow state"
Assistant: "I need to integrate workflow state with Zustand store.
Before implementing, I'll delegate to the reactive-system-architect
agent to get guidance on the proper reactive patterns."

[Uses Task tool to launch reactive-system-architect agent]
[Waits for agent's response]
[Implements based on agent's recommendations]
```

#### ❌ **WRONG - Implement then mention delegation**
```
User: "Update the chatStore to integrate workflow state"
Assistant: "Let me update the chatStore..."
[Implements changes]
[Updates files]
Assistant: "Build passes ✅. I should have consulted the
reactive-system-architect agent for this."  ← TOO LATE!
```

### **Available Specialized Agents**

**ALWAYS CHECK THIS LIST BEFORE STARTING ANY TASK:**

- **reactive-system-architect** - Event system, RxJS, Zustand, state management, reactive patterns
- **ux-guardian** - UI/UX, components, animations, user feedback, accessibility
- **error-infrastructure-architect** - Error handling, error propagation, error boundaries
- **agent-architect** - Multi-agent systems, LangGraph, orchestrator, agent coordination
- **root-cause-enforcer** - Bug fix review, root cause analysis, patch detection
- **project-documentor** - Documentation, ADRs, knowledge capture, README updates
- **react-expert** - React component architecture, hooks, performance optimization, React 19 features
- **system-architect** - Architectural decisions, system design, cross-module dependencies, separation of concerns
- **typescript-type-architect** - TypeScript type systems, type safety, advanced types, eliminating 'any'
- **chrome-extension-expert** - Chrome Extension APIs (chrome.*), Manifest V3, service workers, content scripts, message passing, permissions, CSP
- **n8n-internals-expert** - n8n source code authority, API specifications, workflow JSON schema, node configurations, credential handling
- **git-commit-organizer** - Dependency-aware commit organization, atomic commits, emoji-based commit messages, branch context awareness
- **code-cleaner** - Technical debt removal, unused code detection, deprecated pattern cleanup, pre-release codebase preparation
- **Explore** - Codebase search, file discovery, code understanding

### **Agent Selection Guide**

| Task Type | Agent to Use | When to Delegate |
|-----------|--------------|------------------|
| State management changes | reactive-system-architect | BEFORE modifying chatStore, events, subscribers |
| UI/Component work | ux-guardian | BEFORE creating/modifying React components |
| React-specific patterns | react-expert | BEFORE implementing hooks, performance optimization, React 19 features |
| Error handling | error-infrastructure-architect | BEFORE adding try-catch, error boundaries |
| Agent system changes | agent-architect | BEFORE modifying orchestrator, nodes, tools |
| TypeScript type issues | typescript-type-architect | BEFORE adding types, WHEN encountering 'any', for type system design |
| Architecture decisions | system-architect | BEFORE making design decisions, refactoring, cross-module changes |
| Chrome extension features | chrome-extension-expert | BEFORE using chrome.* APIs, message passing, service workers, permissions, CSP issues |
| n8n integration work | n8n-internals-expert | BEFORE implementing workflow creation, n8n API calls, node configurations, WHEN uncertain about n8n behavior |
| Git commits | git-commit-organizer | WHEN ready to commit changes, for organizing complex changesets into atomic commits |
| Code cleanup | code-cleaner | BEFORE releases, WHEN removing deprecated code, for technical debt cleanup |
| Bug fixes | root-cause-enforcer | AFTER fix to verify root cause addressed |

### **Delegation Checklist**

Before writing ANY code, ask yourself:

- [ ] Does this involve state management? → **reactive-system-architect**
- [ ] Does this involve UI/components? → **ux-guardian**
- [ ] Does this involve React hooks, performance, or React 19 features? → **react-expert**
- [ ] Does this involve error handling? → **error-infrastructure-architect**
- [ ] Does this involve agents/orchestrator? → **agent-architect**
- [ ] Does this involve TypeScript types or have 'any' types? → **typescript-type-architect**
- [ ] Does this involve architectural decisions or cross-module changes? → **system-architect**
- [ ] Does this involve chrome.* APIs, extension messaging, service workers, or permissions? → **chrome-extension-expert**
- [ ] Does this involve n8n API integration, workflow creation, or node configurations? → **n8n-internals-expert**
- [ ] Am I uncertain about how n8n behaves or what format it expects? → **n8n-internals-expert**
- [ ] Is this fixing a bug? → **root-cause-enforcer** (after fix)
- [ ] Should this be documented? → **project-documentor** (after implementation)
- [ ] Am I ready to commit changes? → **git-commit-organizer**
- [ ] Do we need to clean up deprecated code or technical debt? → **code-cleaner**

**If you answered YES to any question above, STOP and delegate FIRST.**

---

## Project Overview

**n8n Pro Extension** is a Chrome/Edge Manifest V3 browser extension that provides AI-powered workflow assistance for n8n. It injects a chatbot interface into local n8n instances (localhost:5678), enabling users to create and optimize workflows using natural language.

**Status:** MVP Complete (Phase 1) - Ready for user testing

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

### Phase 2 Architectural Patterns (2025-11-02)

**Phase 2 introduced type-safe workflow state management and enhanced UX patterns.**

#### Workflow State Machine

**DO:**
- Use explicit state machine (`workflowState`) for workflow lifecycle
- Check state before rendering UI (`state === 'awaiting_approval'`)
- Use derived selectors (`useIsWorkflowActive`, `useCanUserInteract`)
- Emit events for state transitions (not manual state updates)

**DON'T:**
- Use boolean flags (`isPending`, `isLoading`) for workflow state
- Manually set state (`workflowState.state = 'executing'`)
- Skip state validation (use transition functions)
- Confuse transient (`workflowState.plan`) vs persistent (`message.plan`) storage

**Example:**
```typescript
// ✅ CORRECT - Use state machine
import { useChatStore, useIsWorkflowActive } from '@ui/chatStore'

const workflowState = useChatStore(state => state.workflowState)
const isActive = useIsWorkflowActive()

if (workflowState.state === 'awaiting_approval') {
  return <PlanMessage plan={workflowState.plan} />
}

// ❌ WRONG - Boolean flags
const { pendingPlan, sending } = useChatStore.getState()
if (pendingPlan && !sending) { /* ... */ }
```

**See:** `src/shared/types/workflow-state/README.md` for full state machine documentation

#### Agent Metadata Registry

**DO:**
- Use `getAgentMetadata()` for agent configuration
- Add new agents to `AGENT_METADATA` registry (not scattered logic)
- Use helper functions (`shouldShowTokens`, `shouldCreateMessage`)

**DON'T:**
- Hardcode agent-specific logic in components
- Use `switch` statements for agent behavior
- Scatter special cases across multiple files

**Example:**
```typescript
// ✅ CORRECT - Use metadata registry
import { getAgentMetadata } from '@ai/orchestrator/agent-metadata'

const metadata = getAgentMetadata('planner')
const { displayName, workingMessage, shouldShowTokens } = metadata

// ❌ WRONG - Hardcoded special cases
if (agent === 'planner' || agent === 'validator') {
  // Don't show tokens
}
```

**See:** `src/ai/orchestrator/agent-metadata.ts` for registry

#### Dual Storage Pattern

**Transient State** (`workflowState.plan`):
- Current active workflow plan
- Cleared on new workflow
- In-memory (Zustand store)

**Persistent History** (`message.plan`):
- Historical record of plans
- Survives sessions
- Stored in `chrome.storage.local`

**Example:**
```typescript
// ✅ CORRECT - Use appropriate storage
const currentPlan = workflowState.plan        // Transient
const historicalPlan = message.plan           // Persistent

// ❌ WRONG - Confusing the two
await storageSet('currentPlan', workflowState.plan)  // Don't persist transient state
```

**See:** `PHASE-2-MIGRATION-GUIDE.md` for dual storage details

## Accessibility Requirements (WCAG 2.1 AA)

**Phase 2 achieved full WCAG 2.1 AA compliance. All new UI code must maintain this standard.**

### Focus Indicators

**REQUIRED:**
```css
/* All interactive elements MUST have visible focus indicators */
.my-button:focus-visible {
  outline: 3px solid var(--color-primary, #3b82f6);
  outline-offset: 2px;
}

/* Remove outline for mouse users only */
.my-button:focus:not(:focus-visible) {
  outline: none;
}
```

### Color Contrast

**REQUIRED:**
- Text on white background: ≥4.5:1 contrast ratio
- Large text (18pt+): ≥3:1 contrast ratio
- Use `--color-text-muted: #9ca3af` (4.52:1) instead of `#6b7280` (3.1:1)

### ARIA Semantics

**DO:**
```tsx
{/* Collapsible elements */}
<button
  aria-expanded={isExpanded}
  aria-controls="panel-id"
  aria-label="Toggle details"
>
  <span aria-hidden="true">▶</span> Details
</button>
<div id="panel-id">...</div>

{/* Error messages */}
<div role="alert" aria-describedby="error-msg">
  <p id="error-msg">Error details</p>
</div>

{/* Decorative icons */}
<span aria-hidden="true">✓</span>
```

**DON'T:**
```tsx
{/* Duplicate ARIA announcements */}
<div role="status" aria-live="polite">
  <div role="status" aria-live="polite">  {/* ❌ Duplicate */}
    Loading...
  </div>
</div>

{/* Missing ARIA for collapsible */}
<button onClick={() => setExpanded(!expanded)}>  {/* ❌ No aria-expanded */}
  Toggle
</button>

{/* Decorative icons not hidden */}
<span>✓</span>  {/* ❌ Should have aria-hidden="true" */}
```

### Keyboard Navigation

**REQUIRED:**
- All interactive elements focusable (no `tabindex="-1"` on interactive elements)
- Logical tab order (no `tabindex` > 0)
- Auto-focus on critical actions (with delay: `setTimeout(() => ref.current?.focus(), 100)`)

### Screen Readers

**DO:**
- Use semantic HTML (`<button>`, `<a>`, `<nav>`, `<main>`)
- Provide `aria-label` for icon-only buttons
- Use `sr-only` class for screen-reader-only text
- Announce status changes with `role="status"` or `role="alert"`

**Testing:**
- VoiceOver (Mac): `Cmd+F5` to enable
- NVDA (Windows): Free screen reader
- Check announcements for all state transitions

**See:** `PHASE-2-PROGRESS.md` (Week 4) for accessibility fixes

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

### Process & Architecture
❌ **IMPLEMENTING BEFORE DELEGATING TO SPECIALIZED AGENTS** (see MANDATORY DELEGATION-FIRST WORKFLOW at top of file)
❌ Manual logging in orchestrator nodes (use LangGraph bridge)
❌ Bypassing TypeScript with `any` (delegate to **typescript-type-architect** for proper types)
❌ Direct UI updates from services (emit events instead)
❌ Implementing React components without consulting **react-expert** for patterns
❌ Making architectural changes without **system-architect** review
❌ Premature abstraction (wait for 3 duplications)
❌ Large files (split at 400+ lines)

### Extension & Integration
❌ Using chrome.* APIs without consulting **chrome-extension-expert** (easy to violate CSP or permissions)
❌ Assuming n8n API behavior without verifying via **n8n-internals-expert** (leads to incorrect workflow JSON)
❌ Guessing n8n data formats or expected values (always verify against source code)
❌ Making large uncommitted changesets without using **git-commit-organizer** (results in messy git history)
❌ Leaving deprecated code in codebase before releases (use **code-cleaner** proactively)

### Phase 2 Patterns (State Management)
❌ Using boolean flags (`pendingPlan`, `isLoading`) for workflow state (use `workflowState` state machine)
❌ Manually setting state (`workflowState.state = 'executing'`) (use transition functions)
❌ Confusing transient (`workflowState.plan`) vs persistent (`message.plan`) storage
❌ Hardcoding agent-specific logic (use `getAgentMetadata()` registry)
❌ Skipping state validation (always use transition functions)

### Security & Data
❌ Storing API keys in localStorage (use chrome.storage.local)
❌ Embedding credential values (use references only)

### Accessibility (WCAG 2.1 AA)
❌ Missing focus indicators on interactive elements
❌ Color contrast below 4.5:1 (use `--color-text-muted: #9ca3af`)
❌ Duplicate ARIA announcements (single `role="status"` per update)
❌ Decorative icons without `aria-hidden="true"`
❌ Missing `aria-expanded` on collapsible elements

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
