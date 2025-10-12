/**
 * Internal Fetch Wrapper
 *
 * Specialized fetch for n8n's internal REST endpoints that require
 * cookie-based authentication.
 *
 * Difference from apiFetch:
 * - apiFetch: credentials: 'omit' (for API key auth, avoids cookie conflicts)
 * - internalFetch: credentials: 'include' (for cookie auth, shares session with n8n UI)
 */

import { fetchWithTimeout } from './fetch-timeout'
import { ApiError } from './api-fetch'

export type InternalFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
}

function buildHeaders(userHeaders?: Record<string, string>): Record<string, string>
{
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...(userHeaders ?? {})
  }
}

async function parseResponseBody(response: Response): Promise<unknown>
{
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (isJson)
  {
    try { return await response.json() }
    catch { return undefined }
  }

  try { return await response.text() }
  catch { return undefined }
}

/**
 * Fetch wrapper for n8n internal REST endpoints
 *
 * Uses cookie-based authentication (credentials: 'include')
 * Only works from content scripts that share the same origin as n8n.
 *
 * @param url - Full URL to fetch
 * @param options - Request options
 * @returns Parsed response body
 */
export async function internalFetch<T>(url: string, options: InternalFetchOptions = {}): Promise<T>
{
  try
  {
    const fetchOptions: RequestInit = {
      method: options.method ?? 'GET',
      headers: buildHeaders(options.headers),
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include', // Include cookies for session-based auth
    }

    const response = options.timeoutMs
      ? await fetchWithTimeout(url, fetchOptions, options.timeoutMs)
      : await fetch(url, fetchOptions)

    const parsed = await parseResponseBody(response)

    if (!response.ok)
    {
      const statusText = response.statusText || ''
      let details = ''

      if (typeof parsed === 'string') details = parsed
      else if (parsed && typeof parsed === 'object') details = (parsed as { message?: string }).message || JSON.stringify(parsed)

      const message = `Request failed ${response.status}${statusText ? ' ' + statusText : ''}${details ? `: ${details}` : ''}`
      throw new ApiError(message, response.status, url, parsed)
    }

    return (parsed as T)
  }
  catch (error)
  {
    if (error instanceof DOMException && error.name === 'AbortError')
    {
      throw new ApiError('Request timed out', 408, url)
    }

    if (error instanceof ApiError) throw error
    throw new ApiError('Network error', 0, url)
  }
}

