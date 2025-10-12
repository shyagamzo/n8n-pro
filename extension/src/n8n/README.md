# n8n Integration

Client libraries for interacting with n8n.

## Two Client Types

### 1. Public API Client (`N8nClient`)

For documented public API endpoints (`/api/v1/*`):

```typescript
import { N8nClient } from '@n8n'

const client = new N8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'n8n_api_xxxxx'
})

// Public API methods
const workflows = await client.getWorkflows()
const workflow = await client.getWorkflow('workflow-id')
const created = await client.createWorkflow(workflowData)
const updated = await client.updateWorkflow('workflow-id', workflowData)
```

**Authentication:** API key (X-N8N-API-KEY header)
**Usage:** Background scripts, any context with API key
**Endpoints:** `/api/v1/*`

### 2. Internal REST Client (`N8nInternalClient`)

For internal undocumented endpoints (`/rest/*`):

```typescript
import { N8nInternalClient } from '@n8n'

const client = new N8nInternalClient({
  baseUrl: 'http://localhost:5678'
})

// Internal REST methods (cookie-based auth)
const communityNodes = await client.getCommunityNodeTypes()
const allNodes = await client.getNodeTypes()
```

**Authentication:** Cookie-based (browser session)
**Usage:** Content scripts only (shares cookies with n8n page)
**Endpoints:** `/rest/*`

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

### Use `N8nClient` (Public API) when:
- ✅ You have an n8n API key
- ✅ Working in background scripts
- ✅ Need to create/update/read workflows
- ✅ Want predictable, documented API

### Use `N8nInternalClient` (Internal REST) when:
- ✅ Working in content scripts (same origin as n8n)
- ✅ Need access to UI-specific data (community nodes, node types)
- ✅ No API key available but have browser session
- ⚠️ **Warning:** Internal endpoints may change without notice

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

### Create Workflow (Public API)

```typescript
const client = new N8nClient({ apiKey: 'n8n_api_xxx' })

const workflow = await client.createWorkflow({
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
```

### Fetch Community Nodes (Internal REST)

```typescript
const client = new N8nInternalClient()

const communityNodes = await client.getCommunityNodeTypes()
console.log('Installed community nodes:', communityNodes)
```

## References

- **[n8n Public API](https://docs.n8n.io/api/)** - Official API documentation
- **[n8n Source Code](https://github.com/n8n-io/n8n)** - Node type implementations

