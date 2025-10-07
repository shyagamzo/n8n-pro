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
    return apiFetch<{ id: string }>(url, {
      method: 'POST',
      headers: authHeaders,
      body,
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

  async function listCredentials(): Promise<Array<{ id: string; name: string; type: string }>>
  {
    const url = `${baseUrl}/api/v1/credentials`

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
