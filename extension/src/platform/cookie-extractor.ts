/**
 * Cookie Extraction Utilities
 *
 * Extract cookies from the current page or specific URLs for use with
 * n8n's internal REST endpoints.
 *
 * Usage:
 * - Content scripts: Can access cookies via document.cookie
 * - Background scripts: Must use chrome.cookies API
 */

/**
 * Extract cookies from the current page (content script only)
 *
 * @returns Cookie string in format "name1=value1; name2=value2"
 */
export function extractPageCookies(): string
{
  if (typeof document === 'undefined')
  {
    throw new Error('extractPageCookies can only be called from content scripts')
  }

  return document.cookie
}

/**
 * Extract cookies for a specific URL using Chrome API (works in any context)
 *
 * @param url - URL to get cookies for (e.g., 'http://localhost:5678')
 * @returns Cookie string in format "name1=value1; name2=value2"
 */
export async function extractUrlCookies(url: string): Promise<string>
{
  if (typeof chrome === 'undefined' || !chrome.cookies)
  {
    throw new Error('Chrome cookies API not available')
  }

  const cookies = await chrome.cookies.getAll({ url })

  return cookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

/**
 * Extract specific cookies by name from the current page
 *
 * @param names - Array of cookie names to extract
 * @returns Object with cookie name-value pairs
 */
export function extractSpecificCookies(names: string[]): Record<string, string>
{
  if (typeof document === 'undefined')
  {
    throw new Error('extractSpecificCookies can only be called from content scripts')
  }

  const cookies: Record<string, string> = {}
  const cookieString = document.cookie

  for (const name of names)
  {
    const match = cookieString.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))

    if (match)
    {
      cookies[name] = match[1]
    }
  }

  return cookies
}

/**
 * Extract n8n session cookies (common cookie names)
 *
 * @returns Cookie string with n8n session cookies only
 */
export function extractN8nSessionCookies(): string
{
  const n8nCookieNames = [
    'n8n-auth',
    'n8n-session',
    'browser-id',
    '_ga',
    '_ga_',
    'ph_phc_',
    'rl_anonymous_id',
    'rl_user_id',
    'rl_session'
  ]

  if (typeof document === 'undefined')
  {
    throw new Error('extractN8nSessionCookies can only be called from content scripts')
  }

  const cookieString = document.cookie
  const relevantCookies: string[] = []

  for (const cookieName of n8nCookieNames)
  {
    // Match exact name or prefix (for cookies like _ga_699NE13B0K)
    const regex = new RegExp(`(?:^|;\\s*)(${cookieName}[^=]*)=([^;]*)`, 'g')
    let match

    while ((match = regex.exec(cookieString)) !== null)
    {
      relevantCookies.push(`${match[1]}=${match[2]}`)
    }
  }

  return relevantCookies.join('; ')
}

