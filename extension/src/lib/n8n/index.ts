import { apiFetch, ApiError } from '../api/fetch'
import type { WorkflowSummary } from './types'
import { DEFAULTS } from '../constants'
import { N8nApiError } from '../errors'
import { logger } from '../services/logger'
import { withRetry, API_RETRY_OPTIONS } from '../utils/retry'
import { RateLimiters } from '../utils/rate-limit'

export type N8nClientOptions = {
  baseUrl?: string
  apiKey?: string // stored in background only; not used from content scripts
}

export function createN8nClient(options: N8nClientOptions = {})
{
  const baseUrl = (options.baseUrl ?? DEFAULTS.N8N_BASE_URL).replace(/\/$/, '')

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
    
    logger.debug('Fetching workflows from n8n', { url })
    
    try
    {
      // Apply rate limiting and retry logic
      return await withRetry(
        async () =>
        {
          await RateLimiters.n8n.acquire()
          return await apiFetch<WorkflowSummary[]>(url, {
            method: 'GET',
            headers: authHeaders,
            timeoutMs: 10_000,
          })
        },
        API_RETRY_OPTIONS
      )
    }
    catch (error)
    {
      // Convert to N8nApiError for better error handling
      if (error instanceof ApiError)
      {
        logger.error('Failed to fetch workflows', error, { url })
        throw new N8nApiError(error.message, error.status, error.url, error.body)
      }
      throw error
    }
  }

  async function getWorkflow(id: string): Promise<unknown>
  {
    const url = `${baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`
    
    logger.debug('Fetching workflow from n8n', { url, workflowId: id })
    
    try
    {
      return await withRetry(
        async () =>
        {
          await RateLimiters.n8n.acquire()
          return await apiFetch<unknown>(url, {
            method: 'GET',
            headers: authHeaders,
            timeoutMs: 10_000,
          })
        },
        API_RETRY_OPTIONS
      )
    }
    catch (error)
    {
      if (error instanceof ApiError)
      {
        logger.error('Failed to fetch workflow', error, { url, workflowId: id })
        throw new N8nApiError(error.message, error.status, error.url, error.body)
      }
      throw error
    }
  }

  async function createWorkflow(body: unknown): Promise<{ id: string }>
  {
    const url = `${baseUrl}/api/v1/workflows`
    const payload = (typeof body === 'object' && body !== null)
      ? { ...(body as Record<string, unknown>), settings: (body as { settings?: unknown }).settings ?? {} }
      : body
    
    logger.info('Creating workflow in n8n', { url })
    
    try
    {
      return await withRetry(
        async () =>
        {
          await RateLimiters.n8n.acquire()
          return await apiFetch<{ id: string }>(url, {
            method: 'POST',
            headers: authHeaders,
            body: payload,
            timeoutMs: 15_000,
          })
        },
        API_RETRY_OPTIONS
      )
    }
    catch (error)
    {
      if (error instanceof ApiError)
      {
        logger.error('Failed to create workflow', error, { url })
        throw new N8nApiError(error.message, error.status, error.url, error.body)
      }
      throw error
    }
  }

  async function updateWorkflow(id: string, body: unknown): Promise<{ id: string }>
  {
    const url = `${baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`
    
    logger.info('Updating workflow in n8n', { url, workflowId: id })
    
    try
    {
      return await withRetry(
        async () =>
        {
          await RateLimiters.n8n.acquire()
          return await apiFetch<{ id: string }>(url, {
            method: 'PATCH',
            headers: authHeaders,
            body,
            timeoutMs: 15_000,
          })
        },
        API_RETRY_OPTIONS
      )
    }
    catch (error)
    {
      if (error instanceof ApiError)
      {
        logger.error('Failed to update workflow', error, { url, workflowId: id })
        throw new N8nApiError(error.message, error.status, error.url, error.body)
      }
      throw error
    }
  }

  return {
    getWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
  }
}
