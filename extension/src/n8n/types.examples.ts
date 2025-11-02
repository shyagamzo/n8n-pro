/**
 * Type System Examples
 *
 * This file demonstrates proper usage of the strict n8n workflow types.
 * These examples compile with TypeScript strict mode and showcase best practices.
 */

import type {
  N8nNode,
  N8nConnections,
  N8nWorkflow,
  N8nWorkflowCreateInput,
  N8nWorkflowUpdateInput,
  Position,
  N8nCredentials,
  N8nNodeParameters,
  N8nConnectionItem,
} from './types'
import {
  isPosition,
  isN8nNode,
  isConnectionItem,
  isN8nConnections,
} from './types'
import { v4 as uuid } from 'uuid'

// ─────────────────────────────────────────────────────────────
// Example 1: Creating Individual Nodes
// ─────────────────────────────────────────────────────────────

/**
 * Example: Webhook trigger node
 */
export const webhookNode: N8nNode = {
  id: uuid(),
  name: 'Webhook Trigger',
  type: 'n8n-nodes-base.webhook',
  typeVersion: 1,
  position: [0, 0],  // Strict tuple type
  parameters: {
    path: 'user-signup',
    method: 'POST',
    responseMode: 'responseNode',
  },
}

/**
 * Example: HTTP Request node with credentials
 */
export const httpRequestNode: N8nNode = {
  id: uuid(),
  name: 'Fetch User Data',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [200, 0],
  parameters: {
    url: 'https://api.example.com/users',
    method: 'GET',
    authentication: 'genericCredentialType',
    options: {
      timeout: 5000,
      redirect: {
        followRedirects: true,
        maxRedirects: 5,
      },
    },
  },
  credentials: {
    httpBasicAuth: {
      id: 'cred-uuid-123',
      name: 'API Credentials',
    },
  },
}

/**
 * Example: Code node with complex parameters
 */
export const codeNode: N8nNode = {
  id: uuid(),
  name: 'Transform Data',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [400, 0],
  parameters: {
    mode: 'runOnceForAllItems',
    jsCode: `
      // Transform user data
      return items.map(item => ({
        ...item.json,
        timestamp: new Date().toISOString()
      }));
    `,
  },
}

/**
 * Example: Database node with credentials
 */
export const databaseNode: N8nNode = {
  id: uuid(),
  name: 'Save to Database',
  type: 'n8n-nodes-base.postgres',
  typeVersion: 2.4,
  position: [600, 0],
  parameters: {
    operation: 'insert',
    schema: 'public',
    table: 'users',
    columns: 'id, name, email, created_at',
    additionalFields: {},
  },
  credentials: {
    postgres: {
      id: 'postgres-cred-uuid',
      name: 'Production Database',
    },
  },
}

// ─────────────────────────────────────────────────────────────
// Example 2: Creating Connections
// ─────────────────────────────────────────────────────────────

/**
 * Example: Simple linear connection chain
 */
export const linearConnections: N8nConnections = {
  'Webhook Trigger': {
    main: [[
      { node: 'Fetch User Data', type: 'main', index: 0 },
    ]],
  },
  'Fetch User Data': {
    main: [[
      { node: 'Transform Data', type: 'main', index: 0 },
    ]],
  },
  'Transform Data': {
    main: [[
      { node: 'Save to Database', type: 'main', index: 0 },
    ]],
  },
}

/**
 * Example: Multiple outputs (success/error paths)
 */
export const multiOutputConnections: N8nConnections = {
  'HTTP Request': {
    main: [
      // Output 0: Success path
      [{ node: 'Transform Data', type: 'main', index: 0 }],
      // Output 1: Error path
      [{ node: 'Error Handler', type: 'main', index: 0 }],
    ],
  },
}

/**
 * Example: One node connecting to multiple targets
 */
export const fanOutConnections: N8nConnections = {
  'Webhook Trigger': {
    main: [[
      { node: 'Process A', type: 'main', index: 0 },
      { node: 'Process B', type: 'main', index: 0 },
      { node: 'Logger', type: 'main', index: 0 },
    ]],
  },
}

// ─────────────────────────────────────────────────────────────
// Example 3: Complete Workflow Creation
// ─────────────────────────────────────────────────────────────

/**
 * Example: Complete workflow ready for creation
 */
export const newWorkflow: N8nWorkflowCreateInput = {
  name: 'User Signup Automation',
  active: false,  // Create inactive by default
  nodes: [
    {
      id: uuid(),
      name: 'Webhook Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [0, 0],
      parameters: {
        path: 'user-signup',
        method: 'POST',
      },
    },
    {
      id: uuid(),
      name: 'Validate Input',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [200, 0],
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: 'return items.filter(item => item.json.email)',
      },
    },
    {
      id: uuid(),
      name: 'Save User',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.4,
      position: [400, 0],
      parameters: {
        operation: 'insert',
        table: 'users',
      },
      credentials: {
        postgres: {
          id: 'db-cred-uuid',
        },
      },
    },
  ],
  connections: {
    'Webhook Trigger': {
      main: [[
        { node: 'Validate Input', type: 'main', index: 0 },
      ]],
    },
    'Validate Input': {
      main: [[
        { node: 'Save User', type: 'main', index: 0 },
      ]],
    },
  },
  settings: {
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'none',
    saveManualExecutions: true,
    executionTimeout: 300,
    timezone: 'America/New_York',
  },
}

/**
 * Example: Full workflow with all optional fields
 */
export const completeWorkflow: N8nWorkflow = {
  id: 'workflow-uuid-123',
  name: 'Complete Example Workflow',
  active: true,
  nodes: [
    webhookNode,
    httpRequestNode,
    codeNode,
    databaseNode,
  ],
  connections: linearConnections,
  settings: {
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'all',
    saveManualExecutions: true,
    executionTimeout: 600,
    timezone: 'UTC',
    executionOrder: 'v1',
  },
  createdAt: '2025-01-15T12:00:00.000Z',
  updatedAt: '2025-01-15T14:30:00.000Z',
  versionId: 'v1-uuid',
  tags: [
    { id: 'tag-1', name: 'production' },
    { id: 'tag-2', name: 'automation' },
  ],
}

// ─────────────────────────────────────────────────────────────
// Example 4: Workflow Updates
// ─────────────────────────────────────────────────────────────

/**
 * Example: Partial update (activate workflow)
 */
export const activateWorkflow: N8nWorkflowUpdateInput = {
  active: true,
}

/**
 * Example: Update settings only
 */
export const updateSettings: N8nWorkflowUpdateInput = {
  settings: {
    executionTimeout: 900,  // Increase timeout to 15 minutes
    timezone: 'Europe/London',
  },
}

/**
 * Example: Add a new node and update connections
 */
export const addNode: N8nWorkflowUpdateInput = {
  nodes: [
    // Include existing nodes + new node
    webhookNode,
    httpRequestNode,
    codeNode,
    {
      id: uuid(),
      name: 'Email Notification',
      type: 'n8n-nodes-base.emailSend',
      typeVersion: 2,
      position: [800, 0],
      parameters: {
        fromEmail: 'noreply@example.com',
        toEmail: 'admin@example.com',
        subject: 'New User Signup',
      },
      credentials: {
        smtp: {
          id: 'smtp-cred-uuid',
        },
      },
    },
    databaseNode,
  ],
  connections: {
    ...linearConnections,
    'Save to Database': {
      main: [[
        { node: 'Email Notification', type: 'main', index: 0 },
      ]],
    },
  },
}

// ─────────────────────────────────────────────────────────────
// Example 5: Type Guards in Action
// ─────────────────────────────────────────────────────────────

/**
 * Example: Safely parse position from unknown data
 */
export function parsePosition(data: unknown): Position
{
  if (isPosition(data))
  {
    return data
  }

  if (Array.isArray(data) && data.length === 2)
  {
    const [x, y] = data
    if (typeof x === 'number' && typeof y === 'number')
    {
      return [x, y]
    }
  }

  // Default fallback
  return [0, 0]
}

/**
 * Example: Validate node before using
 */
export function processNode(data: unknown): string | null
{
  if (!isN8nNode(data))
  {
    console.error('Invalid node structure')
    return null
  }

  // TypeScript knows data is N8nNode here
  const { name, type, position } = data
  const [x, y] = position  // Position is guaranteed to be tuple

  return `Node "${name}" (${type}) at [${x}, ${y}]`
}

/**
 * Example: Validate connections structure
 */
export function validateConnections(data: unknown): N8nConnections | null
{
  if (!isN8nConnections(data))
  {
    console.error('Invalid connections structure')
    return null
  }

  // TypeScript knows data is N8nConnections here
  // All connections are validated:
  // - Double-nested arrays
  // - Connection items have required fields
  // - Type is "main"

  return data
}

/**
 * Example: Safe connection item parsing
 */
export function parseConnectionItem(data: unknown): N8nConnectionItem | null
{
  if (!isConnectionItem(data))
  {
    return null
  }

  // TypeScript knows data is N8nConnectionItem
  return data
}

// ─────────────────────────────────────────────────────────────
// Example 6: Advanced Type-Safe Patterns
// ─────────────────────────────────────────────────────────────

/**
 * Example: Type-safe connection builder
 */
export function createConnection(
  from: string,
  to: string | string[],
  outputIndex = 0
): { [key: string]: { main: Array<Array<N8nConnectionItem>> } }
{
  const targets = Array.isArray(to) ? to : [to]

  return {
    [from]: {
      main: [
        targets.map(nodeName => ({
          node: nodeName,
          type: 'main' as const,
          index: outputIndex,
        })),
      ],
    },
  }
}

// Usage
const _builtConnection = createConnection('Start', ['Process A', 'Process B'])
void _builtConnection

/**
 * Example: Type-safe node factory
 */
export function createNode(
  name: string,
  type: string,
  position: Position,
  parameters: N8nNodeParameters = {},
  credentials?: N8nCredentials
): N8nNode
{
  return {
    id: uuid(),
    name,
    type,
    typeVersion: 1,
    position,
    parameters,
    credentials,
  }
}

// Usage
const _factoryNode = createNode(
  'My HTTP Request',
  'n8n-nodes-base.httpRequest',
  [100, 200],
  { url: 'https://example.com', method: 'GET' }
)
void _factoryNode

/**
 * Example: Workflow builder with fluent API
 */
export class WorkflowBuilder
{
  private nodes: N8nNode[] = []
  private connections: N8nConnections = {}
  private workflowName = 'Untitled Workflow'
  private isActive = false

  setName(name: string): this
  {
    this.workflowName = name
    return this
  }

  setActive(active: boolean): this
  {
    this.isActive = active
    return this
  }

  addNode(node: N8nNode): this
  {
    this.nodes.push(node)
    return this
  }

  connect(from: string, to: string): this
  {
    if (!this.connections[from])
    {
      this.connections[from] = { main: [] }
    }

    if (!this.connections[from].main)
    {
      this.connections[from].main = []
    }

    // Ensure we have at least one output
    if (this.connections[from].main!.length === 0)
    {
      this.connections[from].main!.push([])
    }

    // Add connection to first output
    this.connections[from].main![0].push({
      node: to,
      type: 'main',
      index: 0,
    })

    return this
  }

  build(): N8nWorkflowCreateInput
  {
    return {
      name: this.workflowName,
      active: this.isActive,
      nodes: this.nodes,
      connections: this.connections,
      settings: {},
    }
  }
}

// Usage
const _builtWorkflow = new WorkflowBuilder()
  .setName('API to Database')
  .setActive(false)
  .addNode(createNode('Webhook', 'n8n-nodes-base.webhook', [0, 0]))
  .addNode(createNode('HTTP Request', 'n8n-nodes-base.httpRequest', [200, 0]))
  .addNode(createNode('Database', 'n8n-nodes-base.postgres', [400, 0]))
  .connect('Webhook', 'HTTP Request')
  .connect('HTTP Request', 'Database')
  .build()
void _builtWorkflow

// ─────────────────────────────────────────────────────────────
// Example 7: Type-Safe Workflow Validation
// ─────────────────────────────────────────────────────────────

/**
 * Example: Comprehensive workflow validation
 */
export function validateWorkflow(data: unknown): N8nWorkflow | null
{
  if (typeof data !== 'object' || data === null)
  {
    return null
  }

  const obj = data as Record<string, unknown>

  // Validate required fields
  if (typeof obj.name !== 'string')
  {
    console.error('Missing or invalid workflow name')
    return null
  }

  if (typeof obj.active !== 'boolean')
  {
    console.error('Missing or invalid active status')
    return null
  }

  if (!Array.isArray(obj.nodes))
  {
    console.error('Missing or invalid nodes array')
    return null
  }

  // Validate all nodes
  const validNodes = obj.nodes.filter(isN8nNode)
  if (validNodes.length !== obj.nodes.length)
  {
    console.error(`${obj.nodes.length - validNodes.length} invalid nodes found`)
    return null
  }

  // Validate connections
  if (!isN8nConnections(obj.connections))
  {
    console.error('Invalid connections structure')
    return null
  }

  // Validate settings
  if (obj.settings && typeof obj.settings !== 'object')
  {
    console.error('Invalid settings object')
    return null
  }

  return {
    name: obj.name,
    active: obj.active,
    nodes: validNodes,
    connections: obj.connections,
    settings: (obj.settings as Record<string, unknown>) ?? {},
    id: typeof obj.id === 'string' ? obj.id : undefined,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : undefined,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
    versionId: typeof obj.versionId === 'string' ? obj.versionId : undefined,
  }
}

// ─────────────────────────────────────────────────────────────
// Example 8: Common Workflow Patterns
// ─────────────────────────────────────────────────────────────

/**
 * Example: Webhook → Process → Save pattern
 */
export function createWebhookWorkflow(
  webhookPath: string,
  processLogic: string,
  tableName: string
): N8nWorkflowCreateInput
{
  return {
    name: `Webhook: ${webhookPath}`,
    active: false,
    nodes: [
      createNode(
        'Webhook',
        'n8n-nodes-base.webhook',
        [0, 0],
        { path: webhookPath, method: 'POST' }
      ),
      createNode(
        'Process',
        'n8n-nodes-base.code',
        [200, 0],
        { mode: 'runOnceForAllItems', jsCode: processLogic }
      ),
      createNode(
        'Save',
        'n8n-nodes-base.postgres',
        [400, 0],
        { operation: 'insert', table: tableName }
      ),
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
      'Process': { main: [[{ node: 'Save', type: 'main', index: 0 }]] },
    },
    settings: {},
  }
}

/**
 * Example: Error handling pattern
 */
export function createErrorHandlingWorkflow(): N8nWorkflowCreateInput
{
  return {
    name: 'Error Handling Example',
    active: false,
    nodes: [
      createNode('Trigger', 'n8n-nodes-base.cron', [0, 0], { triggerTimes: { mode: 'everyHour' } }),
      createNode('Try Operation', 'n8n-nodes-base.httpRequest', [200, 0], { url: 'https://api.example.com' }),
      createNode('On Success', 'n8n-nodes-base.emailSend', [400, -100], { subject: 'Success' }),
      createNode('On Error', 'n8n-nodes-base.emailSend', [400, 100], { subject: 'Error' }),
    ],
    connections: {
      'Trigger': {
        main: [[{ node: 'Try Operation', type: 'main', index: 0 }]],
      },
      'Try Operation': {
        main: [
          [{ node: 'On Success', type: 'main', index: 0 }],  // Output 0: Success
          [{ node: 'On Error', type: 'main', index: 0 }],    // Output 1: Error
        ],
      },
    },
    settings: {},
  }
}
