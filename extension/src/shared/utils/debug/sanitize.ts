/**
 * Data Sanitization Utilities
 *
 * Sanitizes sensitive data from logs to prevent credential leakage.
 */

/**
 * Sensitive field patterns to detect and mask
 */
const SENSITIVE_PATTERNS = {
  apiKey: ['apikey', 'api_key'],
  secret: ['token', 'secret', 'password', 'credential']
} as const

/**
 * Check if a field name matches a sensitive pattern
 */
function isSensitiveField(fieldName: string, patterns: readonly string[]): boolean
{
  const normalized = fieldName.toLowerCase()
  return patterns.some(pattern => normalized.includes(pattern))
}

/**
 * Mask a string value (keep last 4 characters)
 */
function maskString(value: string, keepLength = 4): string
{
  if (value.length <= keepLength)
  {
    return '***'
  }

  return `***${value.slice(-keepLength)}`
}

/**
 * Mask an API key string
 */
function maskApiKey(value: string): string
{
  // OpenAI keys start with sk-
  if (value.startsWith('sk-') && value.length > 20)
  {
    return `sk-***${value.slice(-4)}`
  }

  return maskString(value)
}

/**
 * Sanitize sensitive data from logs
 *
 * Recursively walks through objects/arrays and masks sensitive fields:
 * - API keys (sk-xxx)
 * - Tokens
 * - Secrets
 * - Passwords
 *
 * @param data - Data to sanitize
 * @returns Sanitized copy of data with sensitive values masked
 */
export function sanitize(data: unknown): unknown
{
  if (!data) return data

  // String values - check for API key pattern
  if (typeof data === 'string')
  {
    return maskApiKey(data)
  }

  // Arrays - sanitize each element
  if (Array.isArray(data))
  {
    return data.map(item => sanitize(item))
  }

  // Objects - recursively sanitize values
  if (typeof data === 'object')
  {
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data as Record<string, unknown>))
    {
      // Mask API key fields
      if (isSensitiveField(key, SENSITIVE_PATTERNS.apiKey))
      {
        sanitized[key] = typeof value === 'string' && value.length > 8
          ? maskString(value)
          : '***'
      }
      // Mask secret fields
      else if (isSensitiveField(key, SENSITIVE_PATTERNS.secret))
      {
        sanitized[key] = '***'
      }
      // Recursively sanitize nested objects
      else
      {
        sanitized[key] = sanitize(value)
      }
    }

    return sanitized
  }

  return data
}
