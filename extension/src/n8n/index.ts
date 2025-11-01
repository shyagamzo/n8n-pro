/**
 * n8n Integration - Public API
 *
 * Unified n8n client (recommended):
 * - N8N: Combined client for all n8n public API interactions
 *
 * Specialized clients (for specific use cases):
 * - N8nClient: Public API endpoints (/api/v1/*) with API key auth
 *
 * Node types:
 * - All node types are hardcoded from n8n source code
 * - Use fetchNodeTypes() to get the full node types dictionary
 */

// Unified client (recommended)
export { N8N } from './n8n'
export type { N8nOptions } from './n8n'

// Specialized clients (advanced usage)
export { N8nClient } from './client'
export type { N8nClientOptions } from './client'

// Node types utilities
export { fetchNodeTypes, nodeTypeExists, clearNodeTypesCache } from './node-types'
export type { NodeType, NodeTypesResponse } from './node-types'

// Hardcoded node types
export { HARDCODED_NODE_TYPES } from './hardcoded-node-types'

// Type definitions
export type { WorkflowSummary, Workflow, WorkflowNode, WorkflowConnections } from './types'
