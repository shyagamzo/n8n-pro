import { apiFetch } from '@platform/api-fetch'
import type { WorkflowSummary } from './types'
import { DEFAULTS } from '@shared/constants'

export type N8nClientOptions = {
  baseUrl?: string
  apiKey?: string // stored in background only; not used from content scripts
}

export class N8nClient
{
  private readonly baseUrl: string
  private readonly authHeaders: Record<string, string> | undefined

  constructor(options: N8nClientOptions = {})
  {
    this.baseUrl = (options.baseUrl ?? DEFAULTS.N8N_BASE_URL).replace(/\/$/, '')

    this.authHeaders = options.apiKey
      ? {
          'X-N8N-API-KEY': options.apiKey,
          // Some n8n setups/policies accept Authorization Bearer for PATs; include both safely
          'Authorization': `Bearer ${options.apiKey}`
        }
      : undefined
  }

  async getWorkflows(): Promise<WorkflowSummary[]>
  {
    const url = `${this.baseUrl}/api/v1/workflows`
    return apiFetch<WorkflowSummary[]>(url, {
      method: 'GET',
      headers: this.authHeaders,
      timeoutMs: 10_000,
    })
  }

  async getWorkflow(id: string): Promise<unknown>
  {
    const url = `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`
    return apiFetch<unknown>(url, {
      method: 'GET',
      headers: this.authHeaders,
      timeoutMs: 10_000,
    })
  }

  async createWorkflow(body: unknown): Promise<{ id: string }>
  {
    const url = `${this.baseUrl}/api/v1/workflows`
    const payload = (typeof body === 'object' && body !== null)
      ? { ...(body as Record<string, unknown>), settings: (body as { settings?: unknown }).settings ?? {} }
      : body
    return apiFetch<{ id: string }>(url, {
      method: 'POST',
      headers: this.authHeaders,
      body: payload,
      timeoutMs: 15_000,
    })
  }

  async updateWorkflow(id: string, body: unknown): Promise<{ id: string }>
  {
    const url = `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`
    return apiFetch<{ id: string }>(url, {
      method: 'PATCH',
      headers: this.authHeaders,
      body,
      timeoutMs: 15_000,
    })
  }
}

