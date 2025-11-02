// ─────────────────────────────────────────────────────────────
// Type-Safe n8n Workflow Definitions
// ─────────────────────────────────────────────────────────────
//
// This module provides a complete, type-safe representation of n8n workflow
// structures based on actual n8n API requirements. All types eliminate loose
// `any` and `unknown` types where structural constraints are known.
//
// Key Design Principles:
// 1. Required fields are non-optional (name, active, nodes, connections, settings)
// 2. Position is a strict tuple [number, number], not a general array
// 3. Connections use double-nested arrays: Array<Array<ConnectionItem>>
// 4. Connection keys are source node NAMES (not IDs)
// 5. Node IDs are UUIDs, names must be unique within a workflow
// 6. Parameters remain flexible (Record<string, unknown>) due to node-type variance
//
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Core Primitive Types
// ─────────────────────────────────────────────────────────────

/**
 * 2D position coordinate as a tuple (not a general array).
 *
 * n8n requires exactly two numbers: [x, y]
 */
export type Position = [number, number]

/**
 * Node type identifier in the format "n8n-nodes-base.nodeName"
 *
 * Examples:
 * - "n8n-nodes-base.httpRequest"
 * - "n8n-nodes-base.code"
 * - "@n8n/n8n-nodes-langchain.chatOpenAI"
 */
export type NodeType = string

/**
 * UUID string for node identification
 *
 * Example: "3c9068ec-4880-4fbe-a1c8-f7a1cb3f13e9"
 */
export type NodeId = string

/**
 * Human-readable node name (must be unique within workflow)
 *
 * Example: "HTTP Request", "When fetching a dataset row"
 */
export type NodeName = string

// ─────────────────────────────────────────────────────────────
// Connection Types
// ─────────────────────────────────────────────────────────────

/**
 * A single connection between two nodes.
 *
 * Structure:
 * - node: Target node NAME (not ID)
 * - type: Connection type (always "main" for standard connections)
 * - index: Output index on source node (usually 0)
 */
export type N8nConnectionItem = {
  node: NodeName
  type: 'main'
  index: number
}

/**
 * Output connections for a single output port.
 *
 * This is an array of connections from a single output port to potentially
 * multiple target nodes.
 *
 * Example: [[{ node: "Node A", type: "main", index: 0 }]]
 */
export type N8nConnectionOutput = Array<N8nConnectionItem>

/**
 * All outputs from a single node.
 *
 * CRITICAL: This is a double-nested array structure.
 *
 * Outer array: Multiple output ports (most nodes have 1)
 * Inner array: Multiple connections from each port
 *
 * Example:
 * [
 *   [{ node: "Success Handler", type: "main", index: 0 }],  // Output 0
 *   [{ node: "Error Handler", type: "main", index: 0 }]     // Output 1
 * ]
 */
export type N8nNodeOutputs = Array<N8nConnectionOutput>

/**
 * Main connection map for a node.
 *
 * Currently only "main" connection type is used by n8n.
 */
export type N8nConnectionMap = {
  main?: N8nNodeOutputs
}

/**
 * Complete workflow connections object.
 *
 * CRITICAL: Keys are source node NAMES, not IDs.
 *
 * Structure:
 * {
 *   "Source Node Name": {
 *     main: [
 *       [{ node: "Target Node Name", type: "main", index: 0 }]
 *     ]
 *   }
 * }
 */
export type N8nConnections = Record<NodeName, N8nConnectionMap>

// ─────────────────────────────────────────────────────────────
// Credential Types
// ─────────────────────────────────────────────────────────────

/**
 * Credential reference for a node.
 *
 * Contains:
 * - id: Credential ID in n8n
 * - name: Optional display name
 */
export type N8nCredentialRef = {
  id: string
  name?: string
}

/**
 * Map of credential type to credential reference.
 *
 * Example:
 * {
 *   "googleSheetsOAuth2Api": {
 *     id: "mock",
 *     name: "Google Sheets account"
 *   }
 * }
 */
export type N8nCredentials = Record<string, N8nCredentialRef>

// ─────────────────────────────────────────────────────────────
// Node Parameter Types
// ─────────────────────────────────────────────────────────────

/**
 * Resource locator parameter (n8n-specific UI pattern).
 *
 * Example:
 * {
 *   __rl: true,
 *   value: "mock",
 *   mode: "list"
 * }
 */
export type ResourceLocator = {
  __rl: true
  value: string
  mode: 'list' | 'id' | 'url'
}

/**
 * Node parameters object.
 *
 * Parameters vary by node type, so we keep this flexible while maintaining
 * type safety at the top level. Each node type has its own parameter structure.
 *
 * Common patterns:
 * - Simple values: { url: "https://example.com", method: "GET" }
 * - Resource locators: { documentId: ResourceLocator }
 * - Nested objects: { options: { timeout: 5000 } }
 */
export type N8nNodeParameters = Record<string, unknown>

// ─────────────────────────────────────────────────────────────
// Node Definition
// ─────────────────────────────────────────────────────────────

/**
 * Complete n8n node definition.
 *
 * Required fields:
 * - id: UUID identifier
 * - name: Unique human-readable name within workflow
 * - type: Full node type identifier (e.g., "n8n-nodes-base.httpRequest")
 * - typeVersion: Node type version number (can be decimal like 4.6)
 * - position: Exact [x, y] coordinates as tuple
 * - parameters: Node-specific configuration object
 *
 * Optional fields:
 * - credentials: Map of credential types to credential references
 */
export type N8nNode = {
  id: NodeId
  name: NodeName
  type: NodeType
  typeVersion: number
  position: Position
  parameters: N8nNodeParameters
  credentials?: N8nCredentials
}

// ─────────────────────────────────────────────────────────────
// Workflow Settings
// ─────────────────────────────────────────────────────────────

/**
 * Workflow execution settings.
 *
 * These settings control workflow execution behavior, data retention,
 * and operational parameters.
 */
export type N8nWorkflowSettings = {
  /**
   * Data retention on error: "all" | "none"
   */
  saveDataErrorExecution?: string

  /**
   * Data retention on success: "all" | "none"
   */
  saveDataSuccessExecution?: string

  /**
   * Save manually triggered executions
   */
  saveManualExecutions?: boolean

  /**
   * Execution timeout in seconds (-1 for no timeout)
   */
  executionTimeout?: number

  /**
   * Timezone for execution (e.g., "America/New_York")
   */
  timezone?: string

  /**
   * Execution order: "v0" | "v1"
   */
  executionOrder?: string

  /**
   * Allow arbitrary additional settings
   */
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────
// Workflow Definition
// ─────────────────────────────────────────────────────────────

/**
 * Complete n8n workflow structure.
 *
 * This represents the full workflow object as sent to/from the n8n API.
 *
 * Required fields (all workflows MUST have these):
 * - name: Workflow display name
 * - active: Whether workflow is active (can execute)
 * - nodes: Array of node definitions (minimum 1)
 * - connections: Connection map between nodes
 * - settings: Workflow settings (can be empty object {})
 *
 * Optional fields (assigned by n8n server):
 * - id: Workflow UUID (assigned on creation)
 * - createdAt: ISO timestamp
 * - updatedAt: ISO timestamp
 * - tags: Workflow categorization tags
 * - pinData: Pinned execution data for testing
 * - staticData: Persistent data across executions
 * - versionId: Workflow version identifier
 */
export type N8nWorkflow = {
  // Required fields (must be provided when creating workflow)
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: N8nConnections
  settings: N8nWorkflowSettings

  // Server-assigned fields (present in API responses)
  id?: string
  createdAt?: string
  updatedAt?: string
  versionId?: string

  // Optional metadata and state
  tags?: Array<{ id: string; name: string }>
  pinData?: Record<NodeName, unknown>
  staticData?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────
// Workflow Summary (List View)
// ─────────────────────────────────────────────────────────────

/**
 * Minimal workflow information from list endpoints.
 *
 * Used when fetching workflow lists (GET /api/v1/workflows).
 */
export type N8nWorkflowSummary = {
  id: string
  name: string
  active: boolean
  createdAt?: string
  updatedAt?: string
  tags?: Array<{ id: string; name: string }>
}

// ─────────────────────────────────────────────────────────────
// Helper Types for Workflow Creation
// ─────────────────────────────────────────────────────────────

/**
 * Minimal workflow definition for creation.
 *
 * This type represents the minimum required fields to create a workflow.
 * The server will auto-generate optional fields like `id`, `createdAt`, etc.
 */
export type N8nWorkflowCreateInput = {
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: N8nConnections
  settings: N8nWorkflowSettings
}

/**
 * Partial workflow definition for updates (PATCH requests).
 *
 * All fields are optional when updating an existing workflow.
 */
export type N8nWorkflowUpdateInput = Partial<N8nWorkflowCreateInput>

// ─────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────

/**
 * Type guard to check if a value is a valid Position tuple.
 */
export function isPosition(value: unknown): value is Position
{
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  )
}

/**
 * Type guard to check if a value is a valid N8nConnectionItem.
 */
export function isConnectionItem(value: unknown): value is N8nConnectionItem
{
  if (typeof value !== 'object' || value === null)
  {
    return false
  }

  const item = value as Record<string, unknown>
  return (
    typeof item.node === 'string' &&
    item.type === 'main' &&
    typeof item.index === 'number'
  )
}

/**
 * Type guard to check if a value is a valid N8nNode.
 */
export function isN8nNode(value: unknown): value is N8nNode
{
  if (typeof value !== 'object' || value === null)
  {
    return false
  }

  const node = value as Record<string, unknown>
  return (
    typeof node.id === 'string' &&
    typeof node.name === 'string' &&
    typeof node.type === 'string' &&
    typeof node.typeVersion === 'number' &&
    isPosition(node.position) &&
    typeof node.parameters === 'object' &&
    node.parameters !== null
  )
}

/**
 * Type guard to check if connections object has valid structure.
 */
export function isN8nConnections(value: unknown): value is N8nConnections
{
  if (typeof value !== 'object' || value === null)
  {
    return false
  }

  const connections = value as Record<string, unknown>

  // Check each connection map
  for (const connectionMap of Object.values(connections))
  {
    if (typeof connectionMap !== 'object' || connectionMap === null)
    {
      return false
    }

    const map = connectionMap as Record<string, unknown>

    // If it has 'main', it must be a double-nested array
    if (map.main !== undefined)
    {
      if (!Array.isArray(map.main))
      {
        return false
      }

      // Check double-nesting
      for (const output of map.main)
      {
        if (!Array.isArray(output))
        {
          return false
        }

        // Check each connection item
        for (const item of output)
        {
          if (!isConnectionItem(item))
          {
            return false
          }
        }
      }
    }
  }

  return true
}

// ─────────────────────────────────────────────────────────────
// Backward Compatibility Exports (DEPRECATED)
// ─────────────────────────────────────────────────────────────

/**
 * @deprecated Use N8nWorkflowSummary instead
 */
export type WorkflowSummary = N8nWorkflowSummary

/**
 * @deprecated Use N8nNode instead
 */
export type WorkflowNode = N8nNode

/**
 * @deprecated Use N8nConnections instead
 */
export type WorkflowConnections = N8nConnections

/**
 * @deprecated Use N8nWorkflow instead
 */
export type Workflow = N8nWorkflow
