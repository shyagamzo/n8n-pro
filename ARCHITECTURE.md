# n8n Pro Extension - Architecture

> Technical architecture and design decisions for the n8n Pro Extension

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Design](#component-design)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)
- [Technology Stack](#technology-stack)
- [Design Decisions](#design-decisions)

---

## Overview

The n8n Pro Extension is a Chrome Manifest V3 extension that provides an AI-powered chat interface for creating and managing n8n workflows. The architecture follows a **service worker + content script** pattern with React-based UI components.

### Core Principles

1. **Local-First**: All data stays on the user's machine
2. **Non-Interruptive**: Optional actions, never blocking
3. **Type-Safe**: Strict TypeScript for reliability
4. **Modular**: Clear separation of concerns
5. **Secure**: API keys encrypted, no credential access

---

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Browser Extension                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐           ┌──────────────────┐          │
│  │  Content Script  │◄─────────►│ Background Worker │          │
│  │                  │  Port     │                   │          │
│  │  • Inject UI     │           │  • API Calls      │          │
│  │  • Manage State  │           │  • Orchestrator   │          │
│  │  • User Events   │           │  • Storage        │          │
│  └──────────────────┘           └──────────────────┘          │
│         │                               │                       │
│         │                               ├──► OpenAI API        │
│         │                               ├──► n8n API           │
│         │                               └──► Chrome Storage    │
│         │                                                       │
│  ┌──────────────────┐                                          │
│  │   Chat Panel     │                                          │
│  │   (React)        │                                          │
│  │                  │                                          │
│  │  • MessagesList  │                                          │
│  │  • ChatComposer  │                                          │
│  │  • PlanPreview   │                                          │
│  └──────────────────┘                                          │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │  Options Page    │                                          │
│  │  (React)         │                                          │
│  │                  │                                          │
│  │  • API Keys      │                                          │
│  │  • Settings      │                                          │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Content Script (`src/content/`)

**Responsibilities:**
- Detect n8n pages (checks for `window.location`)
- Inject trigger button into page DOM
- Mount React chat panel
- Manage UI state (open/closed, position)
- Handle user interactions

**Key Files:**
- `index.ts`: Entry point, page detection, injection logic
- Components use Shadow DOM to avoid CSS conflicts with n8n

**Communication:**
- Opens Chrome port to background worker
- Receives streamed tokens and plans
- Sends user messages for processing

---

### 2. Background Worker (`src/background/`)

**Responsibilities:**
- Handle all network requests (CORS limitations)
- Orchestrate AI agents
- Manage secure storage (API keys)
- Process chat messages
- Apply workflow plans to n8n

**Key Files:**
- `index.ts`: Message handlers, API orchestration

**Security:**
- Only component with API key access
- Validates all requests before processing
- Implements rate limiting and retry logic

---

### 3. Chat Panel (`src/panel/`)

**React-based UI for chat interface**

#### Components

**ChatPanel.tsx**
- Main container for chat interface
- Manages panel state (minimized, position, size)
- Integrates with Zustand store

**MessagesList.tsx**
- Displays conversation history
- Streams AI responses in real-time
- Renders plan previews

**ChatComposer.tsx**
- Message input field
- Send button and keyboard shortcuts
- Character count and validation

**PlanPreview/**
- Visual workflow plan display
- Apply/Cancel actions
- Expandable credential guidance
- Deep links to n8n UI

---

### 4. Orchestrator (`src/lib/orchestrator/`)

**AI Agent Coordination**

```
┌────────────────────────────────────────────────────┐
│                  Orchestrator                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐   ┌───────────┐   ┌────────────┐  │
│  │Classifier│──►│ Enrichment│──►│  Planner   │  │
│  └──────────┘   └───────────┘   └────────────┘  │
│                                         │          │
│                                         ▼          │
│                                  ┌────────────┐   │
│                                  │  Executor  │   │
│                                  └────────────┘   │
└────────────────────────────────────────────────────┘
```

**Agent Roles:**

1. **Classifier** (Future): Determines user intent
   - `WORKFLOW_CREATE`, `WORKFLOW_UPDATE`, `QUESTION`, etc.

2. **Enrichment** (Future): Gathers missing information
   - Asks ONE question at a time
   - Provides specific options when possible

3. **Planner**: Generates workflow plans
   - Uses Loom protocol for token efficiency
   - Detects required credentials
   - Creates n8n-compatible workflow JSON

4. **Executor**: Applies plans to n8n
   - Validates workflow structure
   - Creates/updates workflows via API
   - Handles errors gracefully

**Current State:**
- Planner is fully implemented with LLM
- Other agents are placeholders for future expansion
- Direct orchestration for MVP simplicity

---

### 5. Prompt Library (`src/lib/prompts/`)

**Structured Agent Prompts**

```
prompts/
├── agents/
│   ├── classifier.md     # Intent classification
│   ├── enrichment.md     # Clarification questions
│   ├── planner.md        # Workflow planning
│   └── executor.md       # Plan execution
├── shared/
│   ├── n8n-knowledge.md       # n8n platform knowledge
│   ├── n8n-nodes-reference.md # Available nodes
│   ├── workflow-patterns.md   # Common patterns
│   └── constraints.md         # Global rules
└── index.ts              # Prompt builder
```

**Benefits:**
- Externalized prompts for easy editing
- Shared knowledge across agents
- Version controlled
- Hot-reloadable in development

---

### 6. Loom Protocol (`src/lib/loom/`)

**Token-Efficient Structured Data Format**

Traditional JSON:
```json
{"intent":"WORKFLOW_CREATE","confidence":0.95,"nodes":[{"id":"trigger","type":"schedule"}]}
```
**186 chars, ~47 tokens**

Loom Format:
```
intent: WORKFLOW_CREATE
confidence: 0.95
nodes:
  - id: trigger
    type: schedule
```
**114 chars, ~29 tokens (38% reduction)**

**Features:**
- YAML-like indentation-based syntax
- Automatic type inference
- Comment support
- Fast parsing (~0.1ms)
- Validation and error handling

**Use Cases:**
- Agent-to-agent communication
- LLM structured output
- Plan serialization

---

## Data Flow

### 1. Workflow Creation Flow

```
User Message
    │
    ▼
┌───────────────┐
│ Content Script│
└───────┬───────┘
        │ (Port message)
        ▼
┌───────────────┐
│ Background    │
│  handleChat() │
└───────┬───────┘
        │
        ├──► Check OpenAI API key
        │
        ├──► orchestrator.plan()
        │    │
        │    ├──► Build system prompt
        │    ├──► Call OpenAI API
        │    ├──► Parse Loom response
        │    └──► Return Plan object
        │
        ├──► Send plan to UI
        │
        ├──► orchestrator.handle()
        │    │
        │    ├──► Generate conversational response
        │    └──► Stream tokens to UI
        │
        └──► Done
             │
             ▼
        ┌────────────┐
        │ User clicks│
        │   Apply    │
        └─────┬──────┘
              │
              ▼
        ┌───────────────┐
        │ handleApplyPlan()│
        └───────┬───────┘
                │
                ├──► Check n8n credentials
                ├──► n8n.createWorkflow()
                ├──► Generate deep links
                └──► Success response
```

### 2. Message Flow Pattern

```typescript
// Content Script → Background
port.postMessage({
  type: 'chat',
  messages: [...conversation]
})

// Background → Content (streaming)
port.postMessage({ type: 'token', token: 'Hello' })
port.postMessage({ type: 'plan', plan: {...} })
port.postMessage({ type: 'token', token: ' there!' })
port.postMessage({ type: 'done' })

// Content → Background (apply plan)
port.postMessage({
  type: 'apply_plan',
  plan: {...}
})
```

---

## Security Architecture

### API Key Storage

```
┌─────────────────────────────────────────┐
│         chrome.storage.local            │
│      (Browser-encrypted storage)        │
├─────────────────────────────────────────┤
│  openai_api_key:  "sk-..."             │
│  n8n_api_key:     "abc123..."          │
│  n8n_base_url:    "http://..."         │
└─────────────────────────────────────────┘
         │
         │ (Access restricted to)
         ▼
┌─────────────────────────────────────────┐
│       Background Worker Only            │
│                                         │
│  • Options page can write              │
│  • Content script cannot read          │
│  • Never logged or exposed             │
└─────────────────────────────────────────┘
```

### Security Layers

1. **Storage Layer**
   - Chrome encrypts `storage.local` automatically
   - Keys never exposed to page scripts
   - Options page is separate context

2. **Network Layer**
   - All API calls from background worker only
   - Respects CORS and CSP policies
   - HTTPS enforced for API calls
   - Timeout protection

3. **Input Validation**
   - Sanitize all user inputs
   - Validate API key formats
   - Type guards for runtime safety

4. **Error Handling**
   - Sanitize sensitive data from logs
   - User-friendly error messages
   - Never expose keys in errors

5. **Credentials**
   - Never access actual credential values
   - Only reference credential IDs/types
   - LLM never receives credential data

---

## Performance Considerations

### Bundle Size Optimization

**Current Bundle Sizes:**
- Content Script: ~XXX KB (pending measurement)
- Background Worker: ~XXX KB (pending measurement)
- Panel UI: ~XXX KB (pending measurement)

**Optimization Strategies:**
1. Code splitting by entry point
2. Tree shaking unused code
3. Dynamic imports for heavy dependencies
4. Minification in production

### Runtime Performance

**Memory Management:**
- Chat history limited to 100 messages
- Log entries capped at 100
- Unused ports closed properly
- React components memoized

**API Performance:**
- Rate limiting (n8n: 5 req/s, OpenAI: 2 req/s)
- Retry with exponential backoff
- Request timeouts (10-15s)
- Streaming for long responses

**UI Performance:**
- Virtual scrolling for long chats (future)
- Debounced input handlers
- Lazy loading for large components
- Shadow DOM for CSS isolation

---

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **TypeScript** | 5.9.x | Type safety and better DX |
| **React** | 19.x | UI components |
| **Vite** | 7.x | Fast builds and HMR |
| **Zustand** | 5.x | Lightweight state management |
| **LangChain** | 0.3.x | AI agent orchestration |

### Build & Development

| Tool | Purpose |
|------|---------|
| **ESLint** | Code quality and consistency |
| **TypeScript Compiler** | Type checking |
| **Vite Plugin** | Extension manifest generation |
| **Chrome Types** | Extension API types |

### APIs & Services

| Service | Usage |
|---------|-------|
| **OpenAI API** | LLM for chat and planning |
| **n8n REST API** | Workflow CRUD operations |
| **Chrome Extensions API** | Storage, messaging, scripting |

---

## Design Decisions

### Key Architectural Choices

#### 1. Manifest V3 over V2
**Decision:** Use Manifest V3 despite complexity

**Rationale:**
- Future-proof (V2 deprecated in 2024)
- Better security model
- Service worker more resource-efficient
- Required for Chrome Web Store

**Trade-offs:**
- No persistent background page
- Complex port-based messaging
- CORS limitations

---

#### 2. React for UI over Vanilla JS
**Decision:** Use React for all UI components

**Rationale:**
- Component reusability
- Strong ecosystem
- Type-safe with TypeScript
- Familiar to contributors

**Trade-offs:**
- Larger bundle size (~40KB)
- More complex build setup
- React-specific patterns required

---

#### 3. Loom Protocol over JSON
**Decision:** Custom protocol for agent communication

**Rationale:**
- 40-60% token reduction
- Cost savings on LLM calls
- Faster parsing than JSON
- More readable for humans

**Trade-offs:**
- Custom parser maintenance
- Less ecosystem tooling
- Learning curve for contributors

---

#### 4. Zustand over Redux
**Decision:** Lightweight state management

**Rationale:**
- Minimal boilerplate
- Simple API
- Good TypeScript support
- Sufficient for current needs

**Trade-offs:**
- Less ecosystem tooling
- No time-travel debugging
- Simple patterns only

---

#### 5. Monolithic Orchestrator over Multi-Agent (MVP)
**Decision:** Direct orchestration for MVP

**Rationale:**
- Faster to implement
- Easier to debug
- Sufficient for current features
- Can expand later with LangGraph

**Trade-offs:**
- Less flexible
- Harder to test agents in isolation
- More coupling between components

---

## Decision Documents

All architectural decisions are documented in `.cursor/rules/decisions/n8n-extension/`:

- `architecture/`: System architecture and patterns
- `api/`: API integration and data layer
- `ux/`: User experience and design
- `use-cases/`: User scenarios and features
- `browser-extension/`: Extension-specific patterns
- `security/`: Security and privacy
- `governance/`: Development workflow and standards

See decision documents for detailed rationale and context.

---

## Future Architecture Improvements

### Phase 2 Enhancements

1. **Full LangGraph Integration**
   - Replace simple orchestrator with graph
   - Parallel agent execution
   - Conditional routing

2. **Advanced Caching**
   - Cache LLM responses
   - Cache n8n API responses
   - Smart invalidation

3. **Workflow Diffing**
   - Visual diff before applying changes
   - Rollback capability
   - Change history

4. **Multiple LLM Providers**
   - Anthropic Claude
   - Google Gemini
   - Local models (Ollama)

### Phase 3 Enhancements

1. **Collaborative Features**
   - Share workflows
   - Team templates
   - Usage analytics

2. **Advanced AI Features**
   - Fine-tuned models
   - Custom agents
   - Predictive suggestions

---

## References

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [n8n API Documentation](https://docs.n8n.io/api/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [LangChain Documentation](https://js.langchain.com/)
- [React Documentation](https://react.dev/)

---

**Last Updated:** 2025-01
