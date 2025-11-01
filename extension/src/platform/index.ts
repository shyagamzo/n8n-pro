/**
 * Platform Utilities - Public API
 *
 * Browser extension platform abstractions:
 * - API fetch wrapper with timeout and error handling
 * - Cookie extraction utilities
 * - Chrome extension messaging
 * - Settings/storage management
 */

export { apiFetch } from './api-fetch'
export type { RequestOptions } from './api-fetch'

export { fetchWithTimeout } from './fetch-timeout'

export {
  extractPageCookies,
  extractUrlCookies,
  extractSpecificCookies,
  extractN8nSessionCookies
} from './cookie-extractor'

export { ChatPort } from './messaging'

export {
  getOpenAiKey,
  setOpenAiKey,
  getN8nApiKey,
  setN8nApiKey,
  getBaseUrl,
  setBaseUrl,
  getBaseUrlOrDefault
} from './settings'

