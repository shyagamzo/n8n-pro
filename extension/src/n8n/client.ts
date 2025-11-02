import { apiFetch } from '@platform/api-fetch'
import type { WorkflowSummary, N8nWorkflow } from './types'
import { DEFAULTS } from '@shared/constants'
import {
  WorkflowSummaryArraySchema,
  GetWorkflowResponseSchema,
  WorkflowCreateResponseSchema
} from './schemas'

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
    const response = await apiFetch<unknown>(url, {
      method: 'GET',
      headers: this.authHeaders,
      timeoutMs: 10_000,
    })

    // Validate API response
    const result = WorkflowSummaryArraySchema.safeParse(response)
    if (!result.success)
    {
      throw new Error(`Invalid workflow list response from n8n API: ${result.error.message}`)
    }

    return result.data
  }

  async getWorkflow(id: string): Promise<N8nWorkflow>
  {
    const url = `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`
    const response = await apiFetch<unknown>(url, {
      method: 'GET',
      headers: this.authHeaders,
      timeoutMs: 10_000,
    })

    // Validate API response
    const result = GetWorkflowResponseSchema.safeParse(response)

    if (!result.success)
    {
      throw new Error(`Invalid workflow response from n8n API: ${result.error.message}`)
    }

    return result.data
  }

  async createWorkflow(body: unknown): Promise<{ id: string }>
  {
    const url = `${this.baseUrl}/api/v1/workflows`

    // Prepare payload and remove read-only fields
    let payload = body

    if (typeof body === 'object' && body !== null)
    {
      const workflow = body as Record<string, unknown>

      // Remove read-only fields that n8n API rejects during creation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { active, id, createdAt, updatedAt, versionId, ...rest } = workflow

      // Ensure settings exists (required by n8n)
      payload = {
        ...rest,
        settings: workflow.settings ?? {}
      }
    }

    const response = await apiFetch<unknown>(url, {
      method: 'POST',
      headers: this.authHeaders,
      body: payload,
      timeoutMs: 15_000,
    })

    // Validate API response
    const result = WorkflowCreateResponseSchema.safeParse(response)

    if (!result.success)
    {
      throw new Error(`Invalid create workflow response from n8n API: ${result.error.message}`)
    }

    return result.data
  }

  async updateWorkflow(id: string, body: unknown): Promise<{ id: string }>
  {
    const url = `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`
    const response = await apiFetch<unknown>(url, {
      method: 'PATCH',
      headers: this.authHeaders,
      body,
      timeoutMs: 15_000,
    })

    // Validate API response
    const result = WorkflowCreateResponseSchema.safeParse(response)

    if (!result.success)
    {
      throw new Error(`Invalid update workflow response from n8n API: ${result.error.message}`)
    }

    return result.data
  }
}

