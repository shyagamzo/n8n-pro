# n8n Workflow Type System Guide

**Complete, type-safe TypeScript definitions for n8n workflows with zero tolerance for `any` types.**

---

## Overview

This guide documents the strict type system for n8n workflow structures. All types are designed to:

1. **Eliminate `any` and loose `unknown` types** where structure is known
2. **Enforce n8n API requirements** at compile time
3. **Prevent common errors** through type-level validation
4. **Provide excellent IDE autocomplete** and documentation

## Core Types

### Position (Strict Tuple)

```typescript
type Position = [number, number]
```

**Why a tuple?** n8n requires exactly two coordinates. Using `number[]` would allow `[1, 2, 3]` which is invalid.

```typescript
// ✅ CORRECT
const position: Position = [100, 200]

// ❌ WRONG - Compile error
const position: Position = [100]           // Too few elements
const position: Position = [100, 200, 300] // Too many elements
const position: Position = [100]           // Type error
```

**Type Guard:**

```typescript
import { isPosition } from '@n8n/types'

if (isPosition(value)) {
  // TypeScript knows value is [number, number]
  const [x, y] = value
}
```

---

## Connection Types (Double-Nested Arrays)

### Connection Structure

n8n connections use a **double-nested array structure** that is critical to get right:

```typescript
type N8nConnectionItem = {
  node: NodeName        // Target node NAME (not ID!)
  type: 'main'          // Always "main" for standard connections
  index: number         // Output index (usually 0)
}

type N8nConnectionOutput = Array<N8nConnectionItem>
type N8nNodeOutputs = Array<N8nConnectionOutput>  // Double-nested!

type N8nConnectionMap = {
  main?: N8nNodeOutputs
}

type N8nConnections = Record<NodeName, N8nConnectionMap>
```

### Why Double-Nested?

```
Outer Array: Multiple output ports (most nodes have 1)
              ↓
Inner Array: Multiple connections from each port
              ↓
Connection Items: Individual target nodes
```

**Example:**

```typescript
const connections: N8nConnections = {
  "HTTP Request": {
    main: [
      // Output 0 (success) - can connect to multiple nodes
      [
        { node: "Process Data", type: "main", index: 0 },
        { node: "Log Success", type: "main", index: 0 }
      ],
      // Output 1 (error) - single connection
      [
        { node: "Error Handler", type: "main", index: 0 }
      ]
    ]
  },
  "Process Data": {
    main: [
      [{ node: "Save to Database", type: "main", index: 0 }]
    ]
  }
}
```

### Connection Keys Are Node NAMES

**CRITICAL:** Connection keys are source node **names**, not IDs.

```typescript
// ✅ CORRECT - Use node name
const connections: N8nConnections = {
  "HTTP Request": { /* ... */ }
}

// ❌ WRONG - Don't use node ID
const connections = {
  "3c9068ec-4880-4fbe-a1c8-f7a1cb3f13e9": { /* ... */ }
}
```

**Type Guard:**

```typescript
import { isN8nConnections } from '@n8n/types'

if (isN8nConnections(value)) {
  // TypeScript knows value is N8nConnections
  // Validated: double-nesting, connection items, etc.
}
```

---

## Node Definition

### N8nNode Type

```typescript
type N8nNode = {
  // Required fields
  id: NodeId                    // UUID string
  name: NodeName                // Unique within workflow
  type: NodeType                // "n8n-nodes-base.httpRequest"
  typeVersion: number           // Can be decimal (e.g., 4.6)
  position: Position            // Strict [x, y] tuple
  parameters: N8nNodeParameters // Node-specific config

  // Optional fields
  credentials?: N8nCredentials  // Credential references
}
```

### Example: Complete Node

```typescript
import type { N8nNode } from '@n8n/types'

const httpNode: N8nNode = {
  id: "3c9068ec-4880-4fbe-a1c8-f7a1cb3f13e9",
  name: "Fetch User Data",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [100, 200],
  parameters: {
    url: "https://api.example.com/users",
    method: "GET",
    options: {
      timeout: 5000
    }
  },
  credentials: {
    httpBasicAuth: {
      id: "cred-uuid",
      name: "My API Credentials"
    }
  }
}
```

### Node Parameters

```typescript
type N8nNodeParameters = Record<string, unknown>
```

**Why `unknown`?** Each node type has different parameters. Keeping this flexible allows any node type while maintaining type safety at the top level.

**For specific node types**, you can create stricter types:

```typescript
type HttpRequestParameters = {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  authentication?: 'none' | 'basicAuth' | 'oAuth2'
  options?: {
    timeout?: number
    redirect?: {
      followRedirects?: boolean
      maxRedirects?: number
    }
  }
}

// Create type-safe HTTP node
const httpNode: N8nNode & { parameters: HttpRequestParameters } = {
  id: "...",
  name: "HTTP Request",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [100, 200],
  parameters: {
    url: "https://api.example.com",
    method: "GET",  // Type-safe! Only allows HTTP methods
    options: {
      timeout: 5000
    }
  }
}
```

**Type Guard:**

```typescript
import { isN8nNode } from '@n8n/types'

if (isN8nNode(value)) {
  // TypeScript knows value is N8nNode
  // Validated: id, name, type, position tuple, parameters, etc.
}
```

---

## Workflow Definition

### N8nWorkflow Type

```typescript
type N8nWorkflow = {
  // Required fields (MUST provide when creating)
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: N8nConnections
  settings: N8nWorkflowSettings

  // Server-assigned fields (present in responses)
  id?: string
  createdAt?: string
  updatedAt?: string
  versionId?: string

  // Optional metadata
  tags?: Array<{ id: string; name: string }>
  pinData?: Record<NodeName, unknown>
  staticData?: Record<string, unknown>
}
```

### Example: Complete Workflow

```typescript
import type { N8nWorkflow } from '@n8n/types'

const workflow: N8nWorkflow = {
  name: "User Data Sync",
  active: false,
  nodes: [
    {
      id: "node-1-uuid",
      name: "Webhook Trigger",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [0, 0],
      parameters: {
        path: "user-sync",
        method: "POST"
      }
    },
    {
      id: "node-2-uuid",
      name: "Fetch User Data",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [200, 0],
      parameters: {
        url: "https://api.example.com/users",
        method: "GET"
      }
    },
    {
      id: "node-3-uuid",
      name: "Save to Database",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.4,
      position: [400, 0],
      parameters: {
        operation: "insert",
        table: "users"
      }
    }
  ],
  connections: {
    "Webhook Trigger": {
      main: [[
        { node: "Fetch User Data", type: "main", index: 0 }
      ]]
    },
    "Fetch User Data": {
      main: [[
        { node: "Save to Database", type: "main", index: 0 }
      ]]
    }
  },
  settings: {
    saveDataErrorExecution: "all",
    saveDataSuccessExecution: "all",
    saveManualExecutions: true,
    executionTimeout: 300,
    timezone: "America/New_York"
  }
}
```

---

## Workflow Settings

### N8nWorkflowSettings Type

```typescript
type N8nWorkflowSettings = {
  saveDataErrorExecution?: string       // "all" | "none"
  saveDataSuccessExecution?: string     // "all" | "none"
  saveManualExecutions?: boolean
  executionTimeout?: number             // Seconds (-1 = no timeout)
  timezone?: string                     // IANA timezone
  executionOrder?: string               // "v0" | "v1"
  [key: string]: unknown               // Allow custom settings
}
```

**Empty settings are valid:**

```typescript
const workflow: N8nWorkflow = {
  name: "My Workflow",
  active: false,
  nodes: [/* ... */],
  connections: {},
  settings: {}  // ✅ Valid - n8n will use defaults
}
```

---

## Helper Types

### Workflow Creation

```typescript
type N8nWorkflowCreateInput = {
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: N8nConnections
  settings: N8nWorkflowSettings
}
```

Use when **creating** a new workflow (server assigns `id`, `createdAt`, etc.):

```typescript
import { N8nClient } from '@n8n/client'
import type { N8nWorkflowCreateInput } from '@n8n/types'

const newWorkflow: N8nWorkflowCreateInput = {
  name: "My Workflow",
  active: false,
  nodes: [/* ... */],
  connections: {},
  settings: {}
}

const client = new N8nClient({ apiKey: "..." })
const result = await client.createWorkflow(newWorkflow)
// result.id is assigned by server
```

### Workflow Updates

```typescript
type N8nWorkflowUpdateInput = Partial<N8nWorkflowCreateInput>
```

Use when **updating** an existing workflow (all fields optional):

```typescript
import type { N8nWorkflowUpdateInput } from '@n8n/types'

const updates: N8nWorkflowUpdateInput = {
  active: true,  // Only update active status
  settings: {
    executionTimeout: 600  // Increase timeout
  }
}

await client.updateWorkflow("workflow-id", updates)
```

### Workflow Summary

```typescript
type N8nWorkflowSummary = {
  id: string
  name: string
  active: boolean
  createdAt?: string
  updatedAt?: string
  tags?: Array<{ id: string; name: string }>
}
```

Use when fetching workflow lists:

```typescript
const workflows: N8nWorkflowSummary[] = await client.getWorkflows()
```

---

## Credential Types

### N8nCredentialRef

```typescript
type N8nCredentialRef = {
  id: string
  name?: string
}

type N8nCredentials = Record<string, N8nCredentialRef>
```

### Example

```typescript
const credentials: N8nCredentials = {
  // Credential type → Credential reference
  "googleSheetsOAuth2Api": {
    id: "cred-google-uuid",
    name: "My Google Account"
  },
  "slackApi": {
    id: "cred-slack-uuid",
    name: "Slack Workspace"
  }
}

const node: N8nNode = {
  id: "node-uuid",
  name: "Google Sheets",
  type: "n8n-nodes-base.googleSheets",
  typeVersion: 4,
  position: [100, 200],
  parameters: {},
  credentials  // Attach credentials
}
```

---

## Type Guards

Type guards provide **runtime validation** with **compile-time type narrowing**.

### isPosition

```typescript
function isPosition(value: unknown): value is Position

// Usage
if (isPosition(rawPosition)) {
  const [x, y] = rawPosition  // TypeScript knows it's [number, number]
}
```

### isConnectionItem

```typescript
function isConnectionItem(value: unknown): value is N8nConnectionItem

// Usage
if (isConnectionItem(item)) {
  console.log(item.node)   // TypeScript knows structure
  console.log(item.type)   // Always "main"
  console.log(item.index)  // number
}
```

### isN8nNode

```typescript
function isN8nNode(value: unknown): value is N8nNode

// Usage
if (isN8nNode(maybeNode)) {
  // All node fields are type-safe
  const { id, name, type, position, parameters } = maybeNode
}
```

### isN8nConnections

```typescript
function isN8nConnections(value: unknown): value is N8nConnections

// Usage
if (isN8nConnections(connections)) {
  // Validated:
  // - Double-nested array structure
  // - All connection items have required fields
  // - Type is "main"
  for (const [sourceName, connectionMap] of Object.entries(connections)) {
    connectionMap.main?.forEach((output, outputIndex) => {
      output.forEach(item => {
        console.log(`${sourceName} → ${item.node}`)
      })
    })
  }
}
```

---

## Common Patterns

### Creating a Workflow from Scratch

```typescript
import type { N8nWorkflow, N8nNode, N8nConnections } from '@n8n/types'
import { v4 as uuid } from 'uuid'

// 1. Define nodes
const nodes: N8nNode[] = [
  {
    id: uuid(),
    name: "Start",
    type: "n8n-nodes-base.start",
    typeVersion: 1,
    position: [0, 0],
    parameters: {}
  },
  {
    id: uuid(),
    name: "Process",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [200, 0],
    parameters: {
      mode: "runOnceForAllItems",
      jsCode: "return items;"
    }
  }
]

// 2. Define connections (using node NAMES)
const connections: N8nConnections = {
  "Start": {
    main: [[
      { node: "Process", type: "main", index: 0 }
    ]]
  }
}

// 3. Assemble workflow
const workflow: N8nWorkflow = {
  name: "My Workflow",
  active: false,
  nodes,
  connections,
  settings: {}
}
```

### Parsing Unknown Data with Type Guards

```typescript
import { isN8nNode, isN8nConnections } from '@n8n/types'
import type { N8nWorkflow } from '@n8n/types'

function parseWorkflow(data: unknown): N8nWorkflow | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const obj = data as Record<string, unknown>

  // Validate required fields
  if (typeof obj.name !== 'string') return null
  if (typeof obj.active !== 'boolean') return null
  if (!Array.isArray(obj.nodes)) return null
  if (!isN8nConnections(obj.connections)) return null

  // Validate nodes
  const nodes = obj.nodes.filter(isN8nNode)
  if (nodes.length !== obj.nodes.length) {
    console.warn('Some nodes failed validation')
    return null
  }

  return {
    name: obj.name,
    active: obj.active,
    nodes,
    connections: obj.connections,
    settings: (obj.settings as N8nWorkflowSettings) ?? {}
  }
}
```

### Type-Safe Connection Builder

```typescript
type ConnectionBuilder = {
  from: NodeName
  outputs: N8nNodeOutputs
}

function buildConnection(
  from: NodeName,
  to: NodeName | NodeName[]
): ConnectionBuilder {
  const targets = Array.isArray(to) ? to : [to]

  const outputs: N8nNodeOutputs = [
    targets.map(nodeName => ({
      node: nodeName,
      type: 'main' as const,
      index: 0
    }))
  ]

  return { from, outputs }
}

// Usage
const connections: N8nConnections = {
  ...buildConnection("Start", "Process"),
  ...buildConnection("Process", ["Success", "Failure"])
}
```

---

## Migration from Old Types

### Deprecated Types

The following types are **deprecated** but kept for backward compatibility:

```typescript
// ❌ DEPRECATED
type WorkflowSummary = N8nWorkflowSummary
type WorkflowNode = N8nNode
type WorkflowConnections = N8nConnections
type Workflow = N8nWorkflow
```

### Migration Guide

```typescript
// ❌ OLD
import type { Workflow, WorkflowNode } from '@n8n/types'

const node: WorkflowNode = {
  id: "...",
  name: "My Node",
  type: "...",
  typeVersion: 1,
  position: [0, 0],  // Was optional, type was [number, number] | undefined
  parameters: {}     // Was optional
}

// ✅ NEW
import type { N8nWorkflow, N8nNode } from '@n8n/types'

const node: N8nNode = {
  id: "...",
  name: "My Node",
  type: "...",
  typeVersion: 1,
  position: [0, 0],  // Required, strict tuple type
  parameters: {}     // Required (can be empty object)
}
```

---

## Best Practices

### 1. Never Use `any` for Workflows

```typescript
// ❌ WRONG
const workflow: any = { /* ... */ }

// ✅ CORRECT
const workflow: N8nWorkflow = { /* ... */ }
```

### 2. Use Type Guards for Unknown Data

```typescript
// ❌ WRONG
const node = data as N8nNode  // Unsafe type assertion

// ✅ CORRECT
if (isN8nNode(data)) {
  // TypeScript knows data is N8nNode
  const node = data
}
```

### 3. Leverage Position Tuple Type

```typescript
// ❌ WRONG
const position: number[] = [100, 200]  // Too loose

// ✅ CORRECT
const position: Position = [100, 200]  // Strict tuple
```

### 4. Always Use Node Names in Connections

```typescript
// ❌ WRONG
const connections = {
  [node.id]: { /* ... */ }  // Using ID
}

// ✅ CORRECT
const connections: N8nConnections = {
  [node.name]: { /* ... */ }  // Using name
}
```

### 5. Respect Double-Nested Connection Arrays

```typescript
// ❌ WRONG
const connections = {
  "Start": {
    main: [{ node: "End", type: "main", index: 0 }]  // Single array
  }
}

// ✅ CORRECT
const connections: N8nConnections = {
  "Start": {
    main: [[  // Double-nested!
      { node: "End", type: "main", index: 0 }
    ]]
  }
}
```

---

## TypeScript Compiler Integration

### Strict Type Checking

These types work best with strict TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true
  }
}
```

### IDE Autocomplete

All types include comprehensive JSDoc comments for excellent IDE support:

```typescript
const workflow: N8nWorkflow = {
  // Type "name" and your IDE will show:
  // - (property) name: string
  // - Workflow display name

  // Type "nodes" and your IDE will show:
  // - (property) nodes: N8nNode[]
  // - Array of node definitions (minimum 1)
}
```

---

## Summary

This type system provides:

✅ **Zero `any` types** - All structures have precise types
✅ **Compile-time validation** - Catch errors before runtime
✅ **Runtime type guards** - Validate unknown data safely
✅ **Excellent IDE support** - Full autocomplete and documentation
✅ **n8n API compliance** - Matches actual n8n requirements
✅ **Backward compatibility** - Deprecated types for gradual migration

**Key Takeaways:**

1. **Position is a tuple**: `[number, number]`, not `number[]`
2. **Connections are double-nested**: `Array<Array<ConnectionItem>>`
3. **Connection keys are node names**, not IDs
4. **All workflow fields are required** except server-assigned ones
5. **Use type guards** for runtime validation

For questions or issues, refer to `/workspaces/n8n-pro/extension/src/n8n/types.ts`.
