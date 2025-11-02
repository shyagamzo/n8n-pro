# n8n Integration

Unified client library for interacting with n8n.

## Quick Start (Recommended)

Use the unified `N8N` class for all n8n workflow operations:

```typescript
import { N8N, fetchNodeTypes } from '@n8n'

const n8n = new N8N({ apiKey: 'n8n_api_xxxxx' })

// Workflow operations (API key auth)
const workflows = await n8n.getWorkflows()
const workflow = await n8n.getWorkflow('workflow-id')
const created = await n8n.createWorkflow(workflowData)
const updated = await n8n.updateWorkflow('workflow-id', workflowData)

// Node types (hardcoded from n8n source code)
const nodeTypes = await fetchNodeTypes()
```

**Benefits:**
- ✅ Single import, unified API
- ✅ Clean method names
- ✅ Type-safe with full TypeScript support
- ✅ No browser security issues (uses public API only)

## Advanced: Direct API Client

For direct access to the n8n public API:

```typescript
import { N8nClient } from '@n8n'

const client = new N8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'n8n_api_xxxxx'
})

const workflows = await client.getWorkflows()
```

**Use when:** You need fine-grained control over API requests

## Node Types

All node types are pre-extracted from n8n source code:

```typescript
import { fetchNodeTypes, HARDCODED_NODE_TYPES, nodeTypeExists } from '@n8n'

// Get all node types (async for compatibility with agent tools)
const nodeTypes = await fetchNodeTypes()

// Or access directly (synchronous)
const nodeTypesSync = HARDCODED_NODE_TYPES

// Check if a node type exists
const hasGmail = nodeTypeExists(nodeTypes, 'n8n-nodes-base.gmail')

// Get node metadata
const gmailNode = nodeTypes['n8n-nodes-base.gmail']
console.log(gmailNode.displayName) // "Gmail"
console.log(gmailNode.description) // "Consume the Gmail API"
```

### Regenerating Node Types

To update node types from the latest n8n source:

```bash
node scripts/extract-n8n-nodes.js
```

This will:
1. Clone/update the n8n repository
2. Extract node metadata from source files
3. Generate `src/n8n/hardcoded-node-types.ts`

## Architecture

```
┌─────────────────────────────────────────────┐
│            n8n Integration                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │   N8N Client    │  │ Node Types      │  │
│  │   (API Key)     │  │ (Hardcoded)     │  │
│  │                 │  │                 │  │
│  │ /api/v1/*       │  │ 436 nodes       │  │
│  └────────┬────────┘  └─────────────────┘  │
│           │                                 │
│           v                                 │
│  ┌─────────────────────────────────────┐   │
│  │       apiFetch (API key auth)       │   │
│  │       credentials: 'omit'           │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

## Design Decisions

### Why Hardcoded Node Types?

Initially, we tried to fetch node types from n8n's internal REST endpoints (`/rest/*`), but this approach had security issues:
- ❌ Browser CORS restrictions
- ❌ Cookie access limitations in extensions
- ❌ Inconsistent behavior across different contexts

**Solution:** Pre-extract node types from n8n source code:
- ✅ No runtime API calls needed
- ✅ No browser security issues
- ✅ Works in all contexts (background, content, popup)
- ✅ Faster (no network latency)
- ✅ Offline-capable

### When to Use Which

**Use `N8N` (Unified Client) - Recommended ⭐**
- For all workflow CRUD operations
- When you need API key authentication
- Simplest, cleanest API

**Use `N8nClient` (Direct API)**
- When you need fine-grained control over requests
- When building custom API integrations

**Use `fetchNodeTypes()` (Node Metadata)**
- When agents need to know available nodes
- When validating workflow node types
- When providing autocomplete/suggestions

## Examples

### Workflow Operations

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

// Update a workflow
await n8n.updateWorkflow(workflow.id, {
  active: true,
  name: 'Updated Workflow Name'
})

// Get all workflows
const workflows = await n8n.getWorkflows()
```

### Node Type Utilities

```typescript
import { fetchNodeTypes, nodeTypeExists, getNodeDisplayName } from '@n8n'

// Get all node types
const nodeTypes = await fetchNodeTypes()

// Check if a node exists
const hasGmail = nodeTypeExists(nodeTypes, 'n8n-nodes-base.gmail')

// Get node display name
const displayName = getNodeDisplayName(nodeTypes, 'n8n-nodes-base.slack')
// Returns: "Slack"

// Check if it's a trigger node
import { isTriggerNode } from '@n8n'
const isTrigger = isTriggerNode(nodeTypes, 'n8n-nodes-base.scheduleTrigger')
// Returns: true
```

## Type System

**Strict, type-safe TypeScript definitions for n8n workflows.**

```typescript
import type { N8nWorkflow, N8nNode, N8nConnections } from '@n8n/types'
import { isN8nNode, isN8nConnections } from '@n8n/types'

// Create a type-safe workflow
const workflow: N8nWorkflow = {
  name: "My Workflow",
  active: false,
  nodes: [
    {
      id: "uuid-123",
      name: "HTTP Request",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [100, 200],  // Strict [x, y] tuple
      parameters: {
        url: "https://api.example.com",
        method: "GET"
      }
    }
  ],
  connections: {},
  settings: {}
}

// Validate unknown data
if (isN8nNode(unknownData)) {
  // TypeScript knows unknownData is N8nNode
  const { id, name, type } = unknownData
}
```

**Features:**
- ✅ Zero `any` types - All structures have precise types
- ✅ Strict tuple types - `[number, number]` not `number[]`
- ✅ Runtime validation - Type guards for safe parsing
- ✅ Excellent IDE support - Full autocomplete and docs

**Documentation:**
- **[TYPES-GUIDE.md](./TYPES-GUIDE.md)** - Comprehensive usage guide
- **[types.examples.ts](./types.examples.ts)** - Working code examples
- **[TYPE-SYSTEM-IMPROVEMENTS.md](./TYPE-SYSTEM-IMPROVEMENTS.md)** - Migration guide

## References

- **[n8n Public API](https://docs.n8n.io/api/)** - Official API documentation
- **[n8n Source Code](https://github.com/n8n-io/n8n)** - Node type implementations

