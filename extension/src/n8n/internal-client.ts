/**
 * N8n Internal REST Client
 *
 * Handles requests to n8n's internal REST endpoints (/rest/*) that require
 * cookie-based authentication from the browser session.
 *
 * Separation of Concerns:
 * - N8nClient: Public API endpoints (/api/v1/*) with API key auth
 * - N8nInternalClient: Internal REST endpoints (/rest/*) with cookie auth
 */

import { internalFetch } from '@platform/internal-fetch'
import { DEFAULTS } from '@shared/constants'

export type InternalClientOptions = {
  baseUrl?: string
  cookies?: string // Optional: provide cookies directly (for background scripts)
}

/**
 * Response types for internal REST endpoints
 */
export type CommunityNodeType = {
  name: string
  displayName: string
  description: string
  version: number
  packageName?: string
  installedVersion?: string
}

export type NodeTypeInfo = {
  name: string
  displayName: string
  description: string
  group: string[]
  version: number
  inputs: string[]
  outputs: string[]
  properties?: unknown[]
}

/**
 * Client for n8n internal REST endpoints
 *
 * These endpoints use cookie-based authentication from the browser session
 * rather than API keys. Only works when called from content scripts that
 * share cookies with the n8n page.
 */
export class N8nInternalClient
{
  private readonly baseUrl: string
  private readonly cookies?: string

  constructor(options: InternalClientOptions = {})
  {
    this.baseUrl = (options.baseUrl ?? DEFAULTS.N8N_BASE_URL).replace(/\/$/, '')
    this.cookies = options.cookies
  }

  /**
   * Fetch community/installed node types
   *
   * Endpoint: GET /rest/community-node-types
   * Auth: Cookie-based (browser session)
   *
   * Note: This endpoint returns installed community nodes.
   * For built-in nodes, use getBuiltInNodeTypes() instead.
   */
  async getCommunityNodeTypes(): Promise<CommunityNodeType[]>
  {
    const url = `${this.baseUrl}/rest/community-node-types`
    
    return internalFetch<CommunityNodeType[]>(url, {
      method: 'GET',
      headers: this.buildHeaders(),
      timeoutMs: 10_000
    })
  }

  /**
   * Fetch available node types (all nodes)
   *
   * Endpoint: GET /rest/node-types
   * Auth: Cookie-based (browser session)
   *
   * This may return all available nodes including built-in and community.
   * Endpoint availability depends on n8n version.
   */
  async getNodeTypes(): Promise<NodeTypeInfo[]>
  {
    const url = `${this.baseUrl}/rest/node-types`
    
    return internalFetch<NodeTypeInfo[]>(url, {
      method: 'GET',
      headers: this.buildHeaders(),
      timeoutMs: 10_000
    })
  }

  /**
   * Build headers for internal REST requests
   *
   * Internal endpoints expect:
   * - Accept: application/json
   * - Cookie: session cookies (handled by credentials: 'include')
   * - browser-id: optional browser identifier
   * - push-ref: optional push reference
   */
  private buildHeaders(): Record<string, string>
  {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }

    // If cookies provided explicitly (for background scripts), include them
    if (this.cookies)
    {
      headers['Cookie'] = this.cookies
    }

    return headers
  }
}

