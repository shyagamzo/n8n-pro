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
   * List credentials using n8n's internal REST API.
   *
   * Note: This uses the internal /rest/credentials endpoint (not the public API).
   * The public API (/api/v1/credentials) doesn't support listing for security reasons,
   * but the internal endpoint is used by n8n's UI and is accessible with API keys.
   *
   * @param projectId - Optional project ID to filter credentials by project
   */
  async function listCredentials(projectId?: string): Promise<Array<{ id: string; name: string; type: string }>>
  {
    const params = new URLSearchParams({
      includeScopes: 'true',
      includeData: 'false', // Don't include sensitive credential data
    })

    if (projectId)
    {
      params.append('filter', JSON.stringify({ projectId }))
    }

    const url = `${baseUrl}/rest/credentials?${params.toString()}`

    return apiFetch<Array<{ id: string; name: string; type: string }>>(url, {
      method: 'GET',
      headers: authHeaders,
      timeoutMs: 10_000,
    })
  }

  return {
    getWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    listCredentials,
  }
}
