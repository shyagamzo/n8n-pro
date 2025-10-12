/**
 * Unified n8n Client
 *
 * Single interface for all n8n interactions, combining:
 * - Public API endpoints (/api/v1/*) with API key auth
 * - Internal REST endpoints (/rest/*) with cookie auth
 *
 * Architecture:
 * - Composition over inheritance
 * - Delegates to specialized clients internally
 * - Provides clean, unified API externally
 */

import { N8nClient } from './client'
import { N8nInternalClient } from './internal-client'
import type { WorkflowSummary } from './types'
import type { CommunityNodeType, NodeTypeInfo } from './internal-client'

export type N8nOptions = {
  baseUrl?: string
  apiKey?: string
}

/**
 * Unified n8n client
 *
 * Provides access to both public API and internal REST endpoints
 * through a single, cohesive interface.
 *
 * @example
 * ```typescript
 * const n8n = new N8N({ apiKey: 'n8n_api_xxx' })
 *
 * // Public API methods
 * const workflows = await n8n.getWorkflows()
 * await n8n.createWorkflow(workflowData)
 *
 * // Internal REST methods (content scripts only)
 * const nodeTypes = await n8n.getNodeTypes()
 * const communityNodes = await n8n.getCommunityNodes()
 * ```
 */
export class N8N
{
  private readonly api: N8nClient
  private readonly internal: N8nInternalClient

  constructor(options: N8nOptions = {})
  {
    this.api = new N8nClient({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey
    })

    this.internal = new N8nInternalClient({
      baseUrl: options.baseUrl
    })
  }

  // ============================================================================
  // Public API Methods (/api/v1/*)
  // ============================================================================

  /**
   * Get all workflows
   *
   * Endpoint: GET /api/v1/workflows
   * Auth: API key
   */
  async getWorkflows(): Promise<WorkflowSummary[]>
  {
    return this.api.getWorkflows()
  }

  /**
   * Get a specific workflow by ID
   *
   * Endpoint: GET /api/v1/workflows/:id
   * Auth: API key
   */
  async getWorkflow(id: string): Promise<unknown>
  {
    return this.api.getWorkflow(id)
  }

  /**
   * Create a new workflow
   *
   * Endpoint: POST /api/v1/workflows
   * Auth: API key
   */
  async createWorkflow(body: unknown): Promise<{ id: string }>
  {
    return this.api.createWorkflow(body)
  }

  /**
   * Update an existing workflow
   *
   * Endpoint: PATCH /api/v1/workflows/:id
   * Auth: API key
   */
  async updateWorkflow(id: string, body: unknown): Promise<{ id: string }>
  {
    return this.api.updateWorkflow(id, body)
  }

  // ============================================================================
  // Internal REST Methods (/rest/*)
  // ============================================================================

  /**
   * Get all available node types from n8n
   *
   * Endpoint: GET /rest/node-types
   * Auth: Cookie (browser session)
   * Context: Content scripts only
   *
   * Returns all built-in, community, and custom nodes available in the instance.
   */
  async getNodeTypes(): Promise<NodeTypeInfo[]>
  {
    return this.internal.getNodeTypes()
  }

  /**
   * Get installed community nodes
   *
   * Endpoint: GET /rest/community-node-types
   * Auth: Cookie (browser session)
   * Context: Content scripts only
   */
  async getCommunityNodes(): Promise<CommunityNodeType[]>
  {
    return this.internal.getCommunityNodeTypes()
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Check if a specific node type is available
   *
   * @param nodeType - Node type to check (e.g., 'n8n-nodes-base.gmail')
   * @returns True if the node type exists
   */
  async hasNodeType(nodeType: string): Promise<boolean>
  {
    const nodeTypes = await this.getNodeTypes()
    return nodeTypes.some(node => node.name === nodeType)
  }

  /**
   * Search for node types by name or category
   *
   * @param query - Search query (matches name or displayName)
   * @returns Matching node types
   */
  async searchNodeTypes(query: string): Promise<NodeTypeInfo[]>
  {
    const nodeTypes = await this.getNodeTypes()
    const lowerQuery = query.toLowerCase()

    return nodeTypes.filter(node =>
      node.name.toLowerCase().includes(lowerQuery) ||
      node.displayName.toLowerCase().includes(lowerQuery) ||
      node.description.toLowerCase().includes(lowerQuery)
    )
  }
}

