# n8n Pro Extension - API Documentation

> Developer reference for the n8n Pro Extension codebase

## Table of Contents

- [Core Services](#core-services)
- [Error Handling](#error-handling)
- [Utilities](#utilities)
- [Type Definitions](#type-definitions)
- [Messaging Protocol](#messaging-protocol)

---

## Core Services

### Logger Service

**Location:** `src/lib/services/logger.ts`

Centralized logging with level filtering and sanitization.

#### Usage

```typescript
import { logger, LogLevel } from '../services/logger'

// Set minimum log level (default: INFO)
logger.setLevel(LogLevel.DEBUG)

// Log messages
logger.debug('Debugging info', { context: 'value' })
logger.info('Informational message', { userId: 123 })
logger.warn('Warning message', { reason: 'timeout' })
logger.error('Error occurred', error, { operation: 'createWorkflow' })

// Get log entries
const entries = logger.getEntries()

// Export logs for debugging
const logsJson = logger.export()

// Clear logs
logger.clear()
```

#### Log Levels

| Level | Value | When to Use |
|-------|-------|-------------|
| DEBUG | 0 | Detailed diagnostic information |
| INFO | 1 | General informational messages |
| WARN | 2 | Warning messages (potential issues) |
| ERROR | 3 | Error messages (actual failures) |

#### Security Features

- **Automatic sanitization** of API keys, tokens, passwords
- **Redacts sensitive fields** from context objects
- **In-memory storage** (not persisted)
- **Configurable maximum entries** (default: 100)

---

### Settings Service

**Location:** `src/lib/services/settings.ts`

Secure storage and retrieval of API keys and configuration.

#### Usage

```typescript
import {
  getOpenAiKey, setOpenAiKey, clearOpenAiKey,
  getN8nApiKey, setN8nApiKey, clearN8nApiKey,
  getBaseUrl, setBaseUrl, clearBaseUrl
} from '../services/settings'

// OpenAI API Key
const openAiKey = await getOpenAiKey()
await setOpenAiKey('sk-...') // Validates format
await clearOpenAiKey()

// n8n API Key
const n8nKey = await getN8nApiKey()
await setN8nApiKey('abc123...') // Validates format
await clearN8nApiKey()

// n8n Base URL
const baseUrl = await getBaseUrl()
await setBaseUrl('http://localhost:5678') // Validates URL
await clearBaseUrl()
```

#### Validation

All setters validate input before storing:

- **OpenAI keys**: Must start with `sk-` and be 20+ characters
- **n8n keys**: Must be 8+ alphanumeric characters
- **Base URLs**: Must be valid HTTP/HTTPS URLs

Throws `ValidationError` on invalid input.

---

### n8n Client

**Location:** `src/lib/n8n/index.ts`

Type-safe client for n8n REST API with automatic retry and rate limiting.

#### Usage

```typescript
import { createN8nClient } from '../n8n'

const n8n = createN8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'your-api-key'
})

// List workflows
const workflows = await n8n.getWorkflows()
// Returns: WorkflowSummary[]

// Get single workflow
const workflow = await n8n.getWorkflow('workflow-id')
// Returns: unknown (full workflow object)

// Create workflow
const result = await n8n.createWorkflow({
  name: 'My Workflow',
  nodes: [...],
  connections: {...}
})
// Returns: { id: string }

// Update workflow
const updated = await n8n.updateWorkflow('workflow-id', {
  name: 'Updated Name',
  // ... other fields
})
// Returns: { id: string }
```

#### Features

- **Automatic retry** with exponential backoff on failures
- **Rate limiting** (5 requests/second)
- **Request timeouts** (10-15 seconds)
- **Error conversion** to `N8nApiError` for better handling
- **Logging** of all requests and responses

#### Error Handling

```typescript
try {
  await n8n.createWorkflow(workflow)
} catch (error) {
  if (error instanceof N8nApiError) {
    console.error('n8n API error:', error.getUserMessage())
    console.error('Status:', error.status)
    console.error('Retryable:', error.isRetryable())
  }
}
```

---

### Orchestrator

**Location:** `src/lib/orchestrator/index.ts`

AI agent orchestration for workflow planning and chat.

#### Usage

```typescript
import { orchestrator } from '../orchestrator'
import type { ChatMessage } from '../types/chat'

const messages: ChatMessage[] = [
  { id: '1', role: 'user', text: 'Create a Slack workflow', timestamp: new Date() }
]

// Generate workflow plan
const plan = await orchestrator.plan({
  apiKey: 'sk-...',
  messages
})
// Returns: Plan object with workflow, credentials, etc.

// Generate chat response (streaming)
const response = await orchestrator.handle(
  {
    apiKey: 'sk-...',
    messages
  },
  (token) => {
    console.log('Token:', token) // Streamed token
  }
)
// Returns: Full response text
```

#### Plan Object

```typescript
type Plan = {
  title: string                      // Workflow title
  summary: string                    // Brief description
  credentialsNeeded: Credential[]    // Required credentials
  credentialsAvailable?: Credential[] // Available credentials
  workflow: {
    name: string
    nodes: Node[]
    connections: Record<string, unknown>
  }
}
```

---

## Error Handling

### Error Classes

**Location:** `src/lib/errors/index.ts`

#### ExtensionError (Base)

Base class for all extension errors.

```typescript
class ExtensionError extends Error {
  code: string
  context?: Record<string, unknown>
}
```

#### ApiError

HTTP and network failures.

```typescript
class ApiError extends ExtensionError {
  status: number
  url: string
  body?: unknown
  
  isClientError(): boolean  // 4xx status
  isServerError(): boolean  // 5xx status
  isRetryable(): boolean    // Should retry?
}
```

#### N8nApiError

n8n-specific API errors.

```typescript
class N8nApiError extends ApiError {
  getUserMessage(): string  // User-friendly message
}
```

#### OpenAiApiError

OpenAI-specific API errors.

```typescript
class OpenAiApiError extends ApiError {
  getUserMessage(): string  // User-friendly message
}
```

#### ValidationError

Input validation failures.

```typescript
class ValidationError extends ExtensionError {
  field?: string
  getUserMessage(): string
}
```

#### ConfigurationError

Configuration issues (missing API keys, etc.).

```typescript
class ConfigurationError extends ExtensionError {
  getUserMessage(): string
}
```

#### AgentError

AI agent processing failures.

```typescript
class AgentError extends ExtensionError {
  agent?: string
  getUserMessage(): string
}
```

### Helper Functions

```typescript
import { getUserErrorMessage, hasUserMessage } from '../errors'

// Get user-friendly error message from any error
const message = getUserErrorMessage(error)
// Returns: "Authentication failed. Please check your n8n API key..."

// Check if error has user message
if (hasUserMessage(error)) {
  console.log(error.getUserMessage())
}
```

---

## Utilities

### Validation

**Location:** `src/lib/utils/validation.ts`

#### String Validation

```typescript
import {
  validateNonEmptyString,
  validateOpenAiKey,
  validateN8nKey,
  validateUrl,
  validateN8nBaseUrl
} from '../utils/validation'

// Non-empty string
const name = validateNonEmptyString(input, 'workflow name')
// Throws ValidationError if empty

// API keys
const openAiKey = validateOpenAiKey('sk-...')
const n8nKey = validateN8nKey('abc123...')

// URLs
const url = validateUrl('https://example.com', 'Base URL')
const n8nUrl = validateN8nBaseUrl('http://localhost:5678')
```

#### Sanitization

```typescript
import { sanitizeHtml, sanitizeInput } from '../utils/validation'

// HTML escaping (prevents XSS)
const safe = sanitizeHtml('<script>alert("xss")</script>')
// Returns: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

// Input cleaning (removes control characters)
const clean = sanitizeInput('Hello\x00World')
// Returns: "HelloWorld"
```

#### Chat & Workflow Validation

```typescript
import { validateChatMessage, validateWorkflowName } from '../utils/validation'

// Chat message (1-10,000 chars)
const message = validateChatMessage(userInput)

// Workflow name (1-255 chars)
const name = validateWorkflowName(input)
```

#### Type Guards

```typescript
import { isString, isNumber, isBoolean, isObject } from '../utils/validation'

if (isString(value)) {
  // TypeScript knows value is string
}
```

---

### Retry Logic

**Location:** `src/lib/utils/retry.ts`

Exponential backoff retry mechanism.

#### Usage

```typescript
import { withRetry, API_RETRY_OPTIONS, isRetryableError } from '../utils/retry'

// Retry with default options
const result = await withRetry(
  async () => await api.call(),
  API_RETRY_OPTIONS
)

// Custom retry options
const result = await withRetry(
  async () => await api.call(),
  {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError,
    onRetry: (error, attempt, delayMs) => {
      console.log(`Retry ${attempt} in ${delayMs}ms`)
    }
  }
)
```

#### Options

```typescript
type RetryOptions = {
  maxAttempts?: number          // Default: 3
  initialDelayMs?: number       // Default: 1000
  maxDelayMs?: number           // Default: 10000
  backoffMultiplier?: number    // Default: 2
  shouldRetry?: (error: unknown, attempt: number) => boolean
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}
```

#### Pre-configured Options

```typescript
// For API calls (3 attempts, 1s initial delay)
API_RETRY_OPTIONS

// Check if error should be retried
isRetryableError(error) // Returns boolean
```

---

### Rate Limiting

**Location:** `src/lib/utils/rate-limit.ts`

Token bucket algorithm for smooth rate limiting.

#### Usage

```typescript
import { RateLimiter, RateLimiters, withRateLimit } from '../utils/rate-limit'

// Use pre-configured limiters
await RateLimiters.openai.acquire()
await api.callOpenAI()

await RateLimiters.n8n.acquire()
await api.callN8n()

// Create custom limiter
const limiter = new RateLimiter({
  maxTokens: 10,      // Burst capacity
  refillRate: 2       // Tokens per second
})

await limiter.acquire()  // Wait for token
await api.call()

// Or wrap operation
const result = await withRateLimit(
  limiter,
  async () => await api.call()
)

// Try without waiting
if (limiter.tryAcquire()) {
  await api.call()
} else {
  console.log('Rate limited, try again later')
}
```

#### Pre-configured Limiters

```typescript
// OpenAI: 10 burst, 2/sec steady
RateLimiters.openai

// n8n: 20 burst, 5/sec steady
RateLimiters.n8n
```

---

### Loom Protocol

**Location:** `src/lib/loom/`

Token-efficient structured data format for agent communication.

#### Parsing

```typescript
import { parse, parseStrict } from '../loom'

// Parse with error handling
const result = parse(text)
if (result.success) {
  console.log(result.data)
} else {
  console.error(result.errors)
}

// Parse strict (throws on error)
try {
  const data = parseStrict(text)
} catch (error) {
  console.error('Parse error:', error)
}
```

#### Formatting

```typescript
import { format, formatCompact, formatPretty } from '../loom'

const obj = {
  title: 'Test Workflow',
  count: 42,
  nodes: [
    { id: 'trigger', type: 'schedule' }
  ]
}

// Standard formatting
const loom = format(obj)

// Compact (minimal spacing)
const compact = formatCompact(obj)

// Pretty (extra spacing)
const pretty = formatPretty(obj)
```

#### Validation

```typescript
import { validate } from '../loom'

const result = validate(loomText)
if (!result.valid) {
  console.error(result.errors)
}
```

#### Syntax

```loom
# Comments start with #
key: value
number: 42
boolean: true
null_value: null

# Objects with indentation
nested:
  property: value
  deeper:
    value: 123

# Arrays (inline)
tags: urgent, important, automated

# Arrays (multi-line)
items:
  - id: 1
    name: First
  - id: 2
    name: Second
```

---

## Type Definitions

### Chat Types

**Location:** `src/lib/types/chat.ts`

```typescript
type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  timestamp: Date
}
```

### Plan Types

**Location:** `src/lib/types/plan.ts`

```typescript
type Plan = {
  title: string
  summary: string
  credentialsNeeded: Credential[]
  credentialsAvailable?: Credential[]
  workflow: {
    name: string
    nodes: Node[]
    connections: Record<string, unknown>
  }
}

type Credential = {
  type: string        // e.g., "slackApi"
  name?: string
  nodeId?: string
  nodeName?: string
  requiredFor?: string
  status?: string
}
```

### Messaging Types

**Location:** `src/lib/types/messaging.ts`

```typescript
// Content → Background
type ChatRequest = {
  type: 'chat'
  messages: ChatMessage[]
}

type ApplyPlanRequest = {
  type: 'apply_plan'
  plan: Plan
}

// Background → Content
type BackgroundMessage =
  | { type: 'token'; token: string }
  | { type: 'plan'; plan: Plan }
  | { type: 'error'; error: string }
  | { type: 'done' }
```

---

## Messaging Protocol

### Port-based Communication

Content script and background worker communicate via Chrome ports.

#### Content Script Side

```typescript
// Create port
const port = chrome.runtime.connect({ name: 'chat' })

// Send message
port.postMessage({
  type: 'chat',
  messages: [...]
} satisfies ChatRequest)

// Receive messages
port.onMessage.addListener((msg: BackgroundMessage) => {
  if (msg.type === 'token') {
    console.log('Token:', msg.token)
  } else if (msg.type === 'plan') {
    console.log('Plan:', msg.plan)
  } else if (msg.type === 'error') {
    console.error('Error:', msg.error)
  } else if (msg.type === 'done') {
    console.log('Done')
  }
})

// Handle disconnect
port.onDisconnect.addListener(() => {
  console.log('Port disconnected')
})
```

#### Background Worker Side

```typescript
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'chat') return

  port.onMessage.addListener(async (msg: ChatRequest | ApplyPlanRequest) => {
    try {
      if (msg.type === 'chat') {
        // Stream tokens
        port.postMessage({ type: 'token', token: 'Hello' })
        
        // Send plan
        port.postMessage({ type: 'plan', plan: {...} })
        
        // Done
        port.postMessage({ type: 'done' })
      }
    } catch (error) {
      port.postMessage({ type: 'error', error: String(error) })
    }
  })
})
```

---

## Development Tips

### Debugging

```typescript
// Enable debug logging
import { logger, LogLevel } from '../services/logger'
logger.setLevel(LogLevel.DEBUG)

// Export logs
const logs = logger.export()
console.log(logs)

// Check rate limiter state
import { RateLimiters } from '../utils/rate-limit'
console.log('Tokens available:', RateLimiters.openai.getTokens())
console.log('Waiting requests:', RateLimiters.openai.getWaitingCount())
```

### Testing Utilities

```typescript
// Validate data before sending
import { validateChatMessage } from '../utils/validation'
import { validate as validateLoom } from '../loom'

try {
  validateChatMessage(userInput)
  const loom = parseStrict(agentOutput)
  validateLoom(loom)
} catch (error) {
  console.error('Validation failed:', error)
}
```

---

## Additional Resources

- [Architecture Documentation](ARCHITECTURE.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Testing Guide](TESTING-GUIDE.md)
- [Decision Documents](.cursor/rules/decisions/)

---

**Last Updated:** 2025-01
