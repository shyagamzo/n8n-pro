/**
 * Error type representing HTTP and network failures.
 */
export class ApiError extends Error
{
  public readonly status: number
  public readonly url: string
  public readonly body?: unknown

  constructor(message: string, status: number, url: string, body?: unknown)
  {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.url = url
    this.body = body
  }
}

/**
 * Options for apiFetch.
 */
export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
}

function buildHeaders(userHeaders?: Record<string, string>): Record<string, string>
{
  return {
    'Content-Type': 'application/json',
    ...(userHeaders ?? {}),
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
 * Minimal fetch wrapper with timeout, JSON handling, and typed result.
 */
export async function apiFetch<T>(url: string, options: RequestOptions = {}): Promise<T>
{
  const controller = new AbortController()
  const timeoutId = options.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined

  try
  {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: buildHeaders(options.headers),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      // Explicitly omit credentials to avoid sending cookies and affecting n8n UI sessions
      credentials: 'omit',
    })

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
  finally
  {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
