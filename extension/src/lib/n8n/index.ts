import { apiFetch } from '../api/fetch'
import type { WorkflowSummary } from './types'

const DEFAULT_BASE_URL = 'http://localhost:5678'

export type N8nClientOptions = {
  baseUrl?: string
  apiKey?: string // stored in background only; not used from content scripts
}

export function createN8nClient(options: N8nClientOptions = {})
{
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')

  async function getWorkflows(): Promise<WorkflowSummary[]>
  {
    const url = `${baseUrl}/rest/workflows`
    return apiFetch<WorkflowSummary[]>(url, {
      method: 'GET',
      headers: options.apiKey ? { 'X-N8N-API-KEY': options.apiKey } : undefined,
      timeoutMs: 10_000,
    })
  }

  async function getWorkflow(id: string): Promise<unknown>
  {
    const url = `${baseUrl}/rest/workflows/${encodeURIComponent(id)}`
    return apiFetch<unknown>(url, {
      method: 'GET',
      headers: options.apiKey ? { 'X-N8N-API-KEY': options.apiKey } : undefined,
      timeoutMs: 10_000,
    })
  }

  async function createWorkflow(body: unknown): Promise<{ id: string }>
  {
    const url = `${baseUrl}/rest/workflows`
    return apiFetch<{ id: string }>(url, {
      method: 'POST',
      headers: options.apiKey ? { 'X-N8N-API-KEY': options.apiKey } : undefined,
      body,
      timeoutMs: 15_000,
    })
  }

  async function updateWorkflow(id: string, body: unknown): Promise<{ id: string }>
  {
    const url = `${baseUrl}/rest/workflows/${encodeURIComponent(id)}`
    return apiFetch<{ id: string }>(url, {
      method: 'PATCH',
      headers: options.apiKey ? { 'X-N8N-API-KEY': options.apiKey } : undefined,
      body,
      timeoutMs: 15_000,
    })
  }

  async function listCredentials(): Promise<Array<{ id: string; name: string; type: string }>>
  {
    const url = `${baseUrl}/rest/credentials` 
    return apiFetch<Array<{ id: string; name: string; type: string }>>(url, {
      method: 'GET',
      headers: options.apiKey ? { 'X-N8N-API-KEY': options.apiKey } : undefined,
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
