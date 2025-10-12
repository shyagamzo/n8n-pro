# n8n Integration

Unified client library for interacting with n8n.

## Quick Start (Recommended)

Use the unified `N8N` class for all n8n interactions:

```typescript
import { N8N } from '@n8n'

const n8n = new N8N({ apiKey: 'n8n_api_xxxxx' })

// Public API methods (API key auth)
const workflows = await n8n.getWorkflows()
const workflow = await n8n.getWorkflow('workflow-id')
const created = await n8n.createWorkflow(workflowData)

// Internal REST methods (cookie auth, content scripts only)
const nodeTypes = await n8n.getNodeTypes()
const communityNodes = await n8n.getCommunityNodes()

// Convenience methods
const hasGmail = await n8n.hasNodeType('n8n-nodes-base.gmail')
const slackNodes = await n8n.searchNodeTypes('slack')
```

**Benefits:**
- ✅ Single import, unified API
- ✅ Clean method names
- ✅ Handles both API key and cookie auth internally
- ✅ Type-safe with full TypeScript support

## Advanced: Specialized Clients

For specific use cases, you can use the underlying clients directly:

### Public API Client (`N8nClient`)

For documented public API endpoints (`/api/v1/*`):

```typescript
import { N8nClient } from '@n8n'

const client = new N8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'n8n_api_xxxxx'
})

const workflows = await client.getWorkflows()
```

**Use when:** You only need public API access, no internal endpoints

### Internal REST Client (`N8nInternalClient`)

For internal undocumented endpoints (`/rest/*`):

```typescript
import { N8nInternalClient } from '@n8n'

const client = new N8nInternalClient({
  baseUrl: 'http://localhost:5678'
})

const nodeTypes = await client.getNodeTypes()
```

**Use when:** You only need internal REST access (content scripts only)

## Cookie Extraction Utilities

For extracting cookies from the n8n page:

```typescript
import { extractPageCookies, extractN8nSessionCookies } from '@platform'

// Get all cookies from current page
const allCookies = extractPageCookies()

// Get only n8n session cookies
const sessionCookies = extractN8nSessionCookies()

// Get specific cookies by name
const specific = extractSpecificCookies(['n8n-auth', 'browser-id'])
```

## Architecture

```
┌─────────────────────────────────────────────┐
│            n8n Integration                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │   N8nClient     │  │ N8nInternal     │  │
│  │   (API Key)     │  │ Client          │  │
│  │                 │  │ (Cookies)       │  │
│  │ /api/v1/*       │  │ /rest/*         │  │
│  └────────┬────────┘  └────────┬────────┘  │
│           │                    │           │
│           v                    v           │
│  ┌─────────────────────────────────────┐   │
│  │       Fetch Wrappers                │   │
│  ├─────────────────────────────────────┤   │
│  │ apiFetch      │ internalFetch       │   │
│  │ (omit creds)  │ (include creds)     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

## Separation of Concerns

| Concern | Public API | Internal REST |
|---------|------------|---------------|
| **Auth** | API key in header | Cookies from browser |
| **Endpoint** | `/api/v1/*` | `/rest/*` |
| **Usage** | Any context | Content scripts only |
| **Credentials** | `omit` (prevents cookie leaks) | `include` (requires cookies) |
| **Client** | `N8nClient` | `N8nInternalClient` |
| **Fetch** | `apiFetch` | `internalFetch` |

## When to Use Which

### Use `N8N` (Unified Client) - Recommended ⭐
- ✅ For all general n8n interactions
- ✅ When you need both API and internal REST methods
- ✅ Simplest, cleanest API
- ✅ One import, consistent interface

### Use `N8nClient` (Public API Only)
- When you ONLY need public API methods
- When working in background scripts without cookie access
- When you want to avoid any internal endpoint dependencies

### Use `N8nInternalClient` (Internal REST Only)
- When you ONLY need internal REST methods
- When working in content scripts without API key
- When you want explicit control over cookie-based requests

## Node Types

```typescript
import { fetchNodeTypes, getHardcodedNodeTypes } from '@n8n'

// Get hardcoded node types (517 nodes from source code)
const nodeTypes = getHardcodedNodeTypes()

// Check if a node type exists
import { nodeTypeExists } from '@n8n'
const exists = nodeTypeExists(nodeTypes, 'n8n-nodes-base.gmail')
```

## Examples

### Unified Client (Recommended)

```typescript
import { N8N } from '@n8n'

const n8n = new N8N({ apiKey: 'n8n_api_xxx' })

// Create a workflow
const workflow = await n8n.createWorkflow({
  name: 'Daily Joke Email',
  nodes: [
    {
      name: 'Schedule',
      type: 'n8n-nodes-base.scheduleTrigger',
      parameters: { rule: { interval: [{ intervalSize: 1, intervalUnit: 'days' }] } },
      position: [250, 300]
    }
  ],
  connections: {}
})

// Check if a node type is available
const hasGmail = await n8n.hasNodeType('n8n-nodes-base.gmail')

// Search for nodes
const emailNodes = await n8n.searchNodeTypes('email')

// Get all community nodes
const communityNodes = await n8n.getCommunityNodes()
```

### Specialized Clients (Advanced)

```typescript
// Public API only
import { N8nClient } from '@n8n'
const api = new N8nClient({ apiKey: 'n8n_api_xxx' })
const workflows = await api.getWorkflows()

// Internal REST only
import { N8nInternalClient } from '@n8n'
const internal = new N8nInternalClient()
const nodeTypes = await internal.getNodeTypes()
```

## References

- **[n8n Public API](https://docs.n8n.io/api/)** - Official API documentation
- **[n8n Source Code](https://github.com/n8n-io/n8n)** - Node type implementations

