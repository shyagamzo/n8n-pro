/**
 * n8n Integration - Public API
 *
 * Exports both public API client and internal REST client:
 * - N8nClient: Public API endpoints (/api/v1/*) with API key auth
 * - N8nInternalClient: Internal REST endpoints (/rest/*) with cookie auth
 */

export { N8nClient } from './client'
export type { N8nClientOptions } from './client'

export { N8nInternalClient } from './internal-client'
export type { InternalClientOptions, CommunityNodeType, NodeTypeInfo } from './internal-client'

export { fetchNodeTypes, nodeTypeExists } from './node-types'
export { getHardcodedNodeTypes, getNodeTypeCount } from './hardcoded-node-types'
export type { NodeType, NodeTypesResponse } from './node-types'

export type { WorkflowSummary, Workflow, WorkflowNode, WorkflowConnections } from './types'
