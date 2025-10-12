/**
 * Host detection utilities for n8n extension
 */

/**
 * Check if current page is an n8n instance
 */
export function isN8nHost(): boolean {
  try {
    const { hostname, port } = window.location
    return hostname === 'localhost' && port === '5678'
  } catch {
    return false
  }
}

