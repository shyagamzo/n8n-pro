/**
 * Fetch with timeout support using AbortController
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response>
{
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try
  {
    return await fetch(url, { ...init, signal: controller.signal })
  }
  finally
  {
    clearTimeout(timer)
  }
}

