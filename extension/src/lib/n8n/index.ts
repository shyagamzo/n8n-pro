import { apiFetch } from '../api/fetch'
import type { WorkflowSummary } from './types'

const DEFAULT_BASE_URL = 'http://127.0.0.1:5678'

export type N8nClientOptions = {
  baseUrl?: string
  apiKey?: string // stored in background only; not used from content scripts
}

export function createN8nClient(options: N8nClientOptions = {})
{
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')

  const authHeaders: Record<string, string> | undefined = options.apiKey
    ? {
        'X-N8N-API-KEY': options.apiKey,
        // Some n8n setups/policies accept Authorization Bearer for PATs; include both safely
        'Authorization': `Bearer ${options.apiKey}`
      }
    : undefined

  async function getWorkflows(): Promise<WorkflowSummary[]>
  {
    const url = `${baseUrl}/api/v1/workflows`
    return apiFetch<WorkflowSummary[]>(url, {
      method: 'GET',
      headers: authHeaders,
      timeoutMs: 10_000,
    })
  }

  async function getWorkflow(id: string): Promise<unknown>
  {
    const url = `${baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`
    return apiFetch<unknown>(url, {
      method: 'GET',
      headers: authHeaders,
      timeoutMs: 10_000,
    })
  }

  async function createWorkflow(body: unknown): Promise<{ id: string }>
  {
    const url = `${baseUrl}/api/v1/workflows`
    const payload = (typeof body === 'object' && body !== null)
      ? { ...(body as Record<string, unknown>), settings: (body as { settings?: unknown }).settings ?? {} }
      : body
    return apiFetch<{ id: string }>(url, {
      method: 'POST',
      headers: authHeaders,
      body: payload,
      timeoutMs: 15_000,
    })
  }

  async function updateWorkflow(id: string, body: unknown): Promise<{ id: string }>
  {
    const url = `${baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`
    return apiFetch<{ id: string }>(url, {
      method: 'PATCH',
      headers: authHeaders,
      body,
      timeoutMs: 15_000,
    })
  }

  /**
   * List credentials - Currently not supported
   * 
   * IMPORTANT: n8n's credential listing is not accessible via API key authentication:
   * - Public API (/api/v1/credentials): Does not support GET/listing (405 Method Not Allowed)
   * - Internal API (/rest/credentials): Requires session cookie auth, not API key (401 Unauthorized)
   * 
   * The internal /rest/ endpoints are used by n8n's UI and require active browser
   * session cookies. API keys only work with the public /api/v1/ endpoints.
   * 
   * For now, we return empty array. Future solutions:
   * - Wait for n8n to add credential listing to public API
   * - Use content script with page context to access cookies
   * - Accept limitation and work without pre-checking credentials
   * 
   * @param projectId - Optional project ID to filter credentials by project
   */
  async function listCredentials(_projectId?: string): Promise<Array<{ id: string; name: string; type: string }>>
  {
    // Credential listing not supported via API key authentication
    // See comment above for technical details
    return []
  }

  return {
    getWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    listCredentials,
  }
}
