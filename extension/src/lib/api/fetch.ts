export class ApiError extends Error {
  public readonly status: number
  public readonly url: string
  public readonly body?: unknown
  constructor(message: string, status: number, url: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.url = url
    this.body = body
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
}

export async function apiFetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = options.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      // credentials intentionally omitted; n8n typically uses API key auth
    })

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const parsed = isJson ? await response.json().catch(() => undefined) : await response.text().catch(() => undefined)

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status, url, parsed)
    }

    return (parsed as T)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, url)
    }
    if (error instanceof ApiError) throw error
    throw new ApiError('Network error', 0, url)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}





