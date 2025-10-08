# n8n Pro Extension - Architecture Overview

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Environment                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐       ┌───────────────────────────┐    │
│  │  Options Page  │       │    Content Script         │    │
│  │  (Settings UI) │       │  ┌─────────────────────┐  │    │
│  └────────────────┘       │  │  Floating Panel UI  │  │    │
│                           │  │   (Chat Interface)  │  │    │
│                           │  └─────────────────────┘  │    │
│                           └───────────────────────────┘    │
│                                      │                      │
│                                      │ Port Messaging       │
│                                      ▼                      │
│                           ┌───────────────────────────┐    │
│                           │   Background Worker       │    │
│                           │  ┌─────────────────────┐  │    │
│                           │  │   Orchestrator      │  │    │
│                           │  │   (Multi-Agent)     │  │    │
│                           │  └─────────────────────┘  │    │
│                           │  ┌─────────────────────┐  │    │
│                           │  │   n8n API Client    │  │    │
│                           │  └─────────────────────┘  │    │
│                           │  ┌─────────────────────┐  │    │
│                           │  │   OpenAI Client     │  │    │
│                           │  └─────────────────────┘  │    │
│                           └───────────────────────────┘    │
│                                      │                      │
└──────────────────────────────────────┼──────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
          ┌──────────────────┐              ┌──────────────────┐
          │  n8n REST API     │              │  OpenAI API      │
          │  (localhost:5678) │              │  (gpt-4o-mini)   │
          └──────────────────┘              └──────────────────┘
```

## Component Layers

### 1. Presentation Layer

#### Content Script
- **Location**: `src/content/index.ts`
- **Purpose**: Injected into n8n pages, mounts floating panel UI
- **Responsibilities**:
  - Detect n8n pages
  - Mount React chat panel
  - Handle panel visibility
  - Establish port connection to background worker

#### Floating Panel
- **Location**: `src/panel/`
- **Purpose**: Chat-based UI for workflow creation
- **Key Components**:
  - `ChatContainer`: Main container with message history
  - `MessagesList`: Scrollable message display
  - `ChatComposer`: Input field and send button
  - `PlanMessage`: Workflow plan preview with Apply/Cancel
  - `MessageBubble`: Individual message rendering

#### Options Page
- **Location**: `src/options/`
- **Purpose**: Extension settings and API key management
- **Features**:
  - OpenAI API key configuration
  - n8n API key configuration
  - n8n base URL configuration
  - Masked key display for security

### 2. Business Logic Layer

#### Background Worker
- **Location**: `src/background/index.ts`
- **Purpose**: Service worker handling core extension logic
- **Responsibilities**:
  - Message routing between content script and APIs
  - API key storage and retrieval
  - Orchestrator invocation
  - Plan application to n8n

#### Multi-Agent Orchestrator
- **Location**: `src/lib/orchestrator/index.ts`
- **Purpose**: Coordinate AI agents for workflow creation
- **Agent Flow**:
  1. **Classifier** → Determine user intent
  2. **Enrichment** → Ask clarifying questions
  3. **Planner** → Generate workflow plan (Loom format)
  4. **Executor** → Apply plan to n8n

#### Prompt System
- **Location**: `src/lib/prompts/`
- **Purpose**: LLM system prompts and knowledge base
- **Structure**:
  - `agents/`: Individual agent prompts
  - `shared/`: Common knowledge (n8n nodes, patterns, constraints)
  - Markdown-based with Vite `?raw` imports

### 3. Data Layer

#### n8n API Client
- **Location**: `src/lib/n8n/index.ts`
- **Purpose**: Interface with n8n REST API
- **Methods**:
  - `getWorkflows()`: List all workflows
  - `getWorkflow(id)`: Get workflow by ID
  - `createWorkflow(body)`: Create new workflow
  - `updateWorkflow(id, body)`: Update existing workflow

#### OpenAI Client
- **Location**: `src/lib/ai/model.ts`
- **Purpose**: Streaming LLM responses
- **Features**:
  - SSE (Server-Sent Events) streaming
  - Token-by-token response handling
  - Error handling and retry

#### Validation Layer
- **Location**: `src/lib/validation/`
- **Purpose**: Runtime type checking with Zod
- **Components**:
  - `schemas.ts`: Zod schema definitions
  - `guards.ts`: Type guard functions and validators
- **Validates**:
  - n8n API responses
  - Internal data structures
  - User inputs

#### Cache Layer
- **Location**: `src/lib/cache/`
- **Purpose**: In-memory caching with TTL
- **Features**:
  - Automatic expiration
  - Max size enforcement
  - Cache statistics
  - getOrSet pattern

#### Logger Service
- **Location**: `src/lib/logger/`
- **Purpose**: Centralized logging with sanitization
- **Features**:
  - Multiple log levels (DEBUG, INFO, WARN, ERROR)
  - Automatic sensitive data redaction
  - Log persistence in chrome.storage
  - Export functionality

### 4. Infrastructure Layer

#### Fetch Wrapper
- **Location**: `src/lib/api/fetch.ts`
- **Purpose**: HTTP client with retry logic
- **Features**:
  - Timeout support
  - Exponential backoff retry
  - Automatic retry for GET requests
  - Error classification (ApiError)
  - Cookie isolation (`credentials: 'omit'`)

#### Retry Logic
- **Location**: `src/lib/utils/retry.ts`
- **Purpose**: Retry mechanism for transient failures
- **Features**:
  - Exponential backoff
  - Configurable max retries
  - Custom retry predicate
  - Automatic for network/timeout/server errors

#### Storage Utilities
- **Location**: `src/lib/utils/storage.ts`
- **Purpose**: Type-safe chrome.storage wrapper
- **Methods**:
  - `storageGet<T>(key)`: Get typed value
  - `storageSet<T>(key, value)`: Set typed value
  - `storageRemove(key)`: Remove value

## Data Flow

### Workflow Creation Flow

```
User Input (Chat)
      ↓
Content Script (Panel)
      ↓ (Port Message: 'chat')
Background Worker
      ↓
Orchestrator.handle()
      ↓
OpenAI API (Streaming)
      ↓ (Tokens)
Background Worker
      ↓ (Port Message: 'token')
Content Script (Panel)
      ↓
Update UI (Streaming Text)
      
When Plan Generated:
      ↓
Orchestrator.plan()
      ↓
Loom Parser (Validate & Parse)
      ↓
Plan Object
      ↓ (Port Message: 'plan')
Content Script (Panel)
      ↓
Display Plan Preview
      
User Clicks "Apply":
      ↓
Content Script
      ↓ (Port Message: 'apply_plan')
Background Worker
      ↓
n8n.createWorkflow()
      ↓
n8n API
      ↓ (Workflow Created)
Background Worker
      ↓ (Port Message: 'done')
Content Script (Panel)
      ↓
Display Success + Deep Links
```

### Message Types

#### Content → Background

```typescript
type ChatRequest = {
  type: 'chat'
  messages: ChatMessage[]
}

type ApplyPlanRequest = {
  type: 'apply_plan'
  plan: Plan
}
```

#### Background → Content

```typescript
type TokenMessage = {
  type: 'token'
  token: string
}

type PlanMessage = {
  type: 'plan'
  plan: Plan
}

type ErrorMessage = {
  type: 'error'
  error: string
}

type DoneMessage = {
  type: 'done'
}
```

## State Management

### UI State (Zustand)
- **Location**: `src/lib/state/chatStore.ts`
- **Purpose**: React component state
- **Stores**:
  - Chat messages
  - Pending plan
  - Loading states
  - Error states

### Persistent State (chrome.storage)
- **API Keys**: Encrypted by browser
- **Settings**: Base URL, preferences
- **Logs**: Development debugging (if enabled)

### Ephemeral State
- **Cache**: API responses with TTL
- **Session**: In-memory during extension runtime

## Security Considerations

### API Key Handling
1. Stored in `chrome.storage.local` (browser-encrypted)
2. Never accessible from content scripts
3. Only background worker has access
4. Masked display in UI (`sk-...****`)

### Cookie Isolation
- All API calls use `credentials: 'omit'`
- Prevents interference with n8n UI session
- Base URL uses `127.0.0.1` instead of `localhost`

### Data Sanitization
- Logger automatically redacts sensitive patterns
- API keys, tokens, passwords filtered from logs
- Context objects sanitized before logging

### Content Security
- No `eval()` or `Function()` constructors
- Strict TypeScript type checking
- Input validation with Zod schemas
- DOMPurify for user-generated content

## Performance Optimizations

### Caching Strategy
- **Workflows List**: 5-minute TTL
- **Credentials List**: 5-minute TTL
- **Workflow Details**: On-demand, no cache

### Retry Strategy
- **GET requests**: Auto-retry with exponential backoff
- **POST/PUT/PATCH**: No auto-retry (requires explicit opt-in)
- **Max retries**: 3 attempts
- **Backoff**: 1s → 2s → 4s

### Bundle Optimization
- Vite code splitting per entry point
- Tree shaking for unused code
- CSS deduplication
- Minification in production

## Extension Lifecycle

### Installation
1. User loads unpacked extension
2. Background worker initializes
3. Content script injected on n8n pages
4. Panel UI mounted when button clicked

### Runtime
1. User opens chat panel
2. Background worker establishes port connection
3. Messages exchanged via port
4. API calls made from background worker
5. Streaming responses forwarded to UI

### Shutdown
1. Extension unloaded
2. Port disconnected
3. In-memory cache cleared
4. Persistent data remains in chrome.storage

## Development Workflow

### Local Development
1. `npm run dev` - Start Vite dev server
2. Load extension from `dist/` folder
3. Make changes to source files
4. Vite HMR updates React components
5. Reload extension for background/content changes

### Production Build
1. `npm run build` - Vite production build
2. Output to `dist/` folder
3. Manifest V3 compatible
4. Minified and optimized

## Testing Strategy

### Manual Testing
- See [TESTING-GUIDE.md](../TESTING-GUIDE.md)
- 10 test scenarios covering core features
- Error handling and edge cases

### Future: Automated Testing
- Unit tests with Jest
- Component tests with Testing Library
- Integration tests with MSW (Mock Service Worker)
- E2E tests with Playwright

## Open Architecture Decisions

1. **State Persistence**: Chat history not persisted (future feature)
2. **Offline Support**: No offline capability (requires API connection)
3. **Multi-Instance**: Extension works with one n8n instance at a time
4. **LLM Provider**: OpenAI only (future: Anthropic, local models)
5. **Agent Framework**: LangGraph (future: more sophisticated routing)

## Related Documentation

- [README.md](./README.md) - Setup and usage
- [development-milestones.md](../development-milestones.md) - Project roadmap
- [TESTING-GUIDE.md](../TESTING-GUIDE.md) - Testing procedures
- [Loom Protocol](./src/lib/loom/README.md) - Inter-agent communication
- [Prompt System](./src/lib/prompts/README.md) - LLM prompts and knowledge base
