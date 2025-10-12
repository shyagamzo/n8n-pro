/**
 * n8n Integration - Public API
 *
 * Unified n8n client (recommended):
 * - N8N: Combined client for all n8n interactions
 *
 * Specialized clients (for specific use cases):
 * - N8nClient: Public API endpoints (/api/v1/*) with API key auth
 * - N8nInternalClient: Internal REST endpoints (/rest/*) with cookie auth
 */

// Unified client (recommended)
export { N8N } from './n8n'
export type { N8nOptions } from './n8n'

// Specialized clients (advanced usage)
export { N8nClient } from './client'
export type { N8nClientOptions } from './client'

export { N8nInternalClient } from './internal-client'
export type { InternalClientOptions, CommunityNodeType, NodeTypeInfo } from './internal-client'

// Node types utilities
export { fetchNodeTypes, nodeTypeExists, clearNodeTypesCache } from './node-types'
export type { NodeType, NodeTypesResponse } from './node-types'

// Type definitions
export type { WorkflowSummary, Workflow, WorkflowNode, WorkflowConnections } from './types'
