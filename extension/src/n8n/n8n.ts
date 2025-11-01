/**
 * Unified n8n Client
 *
 * Single interface for all n8n interactions with the public API.
 * Uses API key authentication for all workflow operations.
 *
 * Architecture:
 * - Composition over inheritance
 * - Delegates to specialized N8nClient for API operations
 * - Provides clean, unified API externally
 */

import { N8nClient } from './client'
import type { WorkflowSummary } from './types'

export type N8nOptions = {
  baseUrl?: string
  apiKey?: string
}

/**
 * Unified n8n client
 *
 * Provides access to n8n public API endpoints through a simple interface.
 *
 * @example
 * ```typescript
 * const n8n = new N8N({ apiKey: 'n8n_api_xxx' })
 *
 * // Workflow operations
 * const workflows = await n8n.getWorkflows()
 * await n8n.createWorkflow(workflowData)
 * await n8n.updateWorkflow(id, workflowData)
 * ```
 */
export class N8N
{
  private readonly api: N8nClient

  constructor(options: N8nOptions = {})
  {
    this.api = new N8nClient({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey
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

}

