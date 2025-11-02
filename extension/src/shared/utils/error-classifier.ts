/**
 * Error classification utilities
 *
 * Provides pattern-matching error classification for consistent error handling
 * across the application. Uses lookup tables instead of if-else chains for
 * better maintainability and extensibility.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'timeout'
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'server_error'
  | 'unknown'

/**
 * Error classification result
 */
export interface ErrorClassification
{
  category: ErrorCategory
  userMessage: string
  technicalMessage: string
}

// ─────────────────────────────────────────────────────────────
// Pattern Definitions
// ─────────────────────────────────────────────────────────────

/**
 * Error pattern matcher
 */
type ErrorPattern = {
  patterns: string[]
  category: ErrorCategory
  getUserMessage: (baseUrl?: string) => string
}

/**
 * Lookup table for error patterns
 *
 * Patterns are checked in order, first match wins.
 * More specific patterns should come before generic ones.
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // Timeout errors
  {
    patterns: ['timeout', 'econnaborted'],
    category: 'timeout',
    getUserMessage: (baseUrl) =>
      `n8n API request timed out. Check if n8n is running at ${baseUrl || 'localhost:5678'}`
  },

  // Network errors
  {
    patterns: ['fetch', 'network', 'econnrefused'],
    category: 'network',
    getUserMessage: (baseUrl) =>
      `Failed to connect to n8n at ${baseUrl || 'localhost:5678'}. Ensure n8n is running.`
  },

  // Authentication errors
  {
    patterns: ['401', 'unauthorized'],
    category: 'authentication',
    getUserMessage: () =>
      'n8n API key is invalid or missing. Check your API key in extension options.'
  },

  // Authorization errors
  {
    patterns: ['403', 'forbidden'],
    category: 'authorization',
    getUserMessage: () =>
      'n8n API key does not have permission to create workflows.'
  },

  // Server errors
  {
    patterns: ['500', 'internal server'],
    category: 'server_error',
    getUserMessage: () =>
      'n8n server error. Check n8n logs for details.'
  }
]

// ─────────────────────────────────────────────────────────────
// Classification Logic
// ─────────────────────────────────────────────────────────────

/**
 * Classifies an error by matching its message against known patterns
 *
 * Uses pattern-matching lookup table instead of if-else chains for:
 * - Better maintainability (add new patterns without modifying logic)
 * - Clear separation of patterns and behavior
 * - Easier testing (test patterns independently)
 *
 * @param error - Error to classify (should already be normalized via normalizeError)
 * @param baseUrl - Optional n8n base URL for contextualized messages
 * @returns Error classification with category and user-friendly message
 *
 * @example
 * ```typescript
 * const classification = classifyError(error, 'http://localhost:5678')
 * emitApiError(error, 'executor', {
 *   ...context,
 *   errorCategory: classification.category
 * })
 * ```
 */
export function classifyError(error: Error, baseUrl?: string): ErrorClassification
{
  const errorMessage = error.message.toLowerCase()

  // Find first matching pattern
  for (const pattern of ERROR_PATTERNS)
  {
    const matches = pattern.patterns.some(p => errorMessage.includes(p))

    if (matches)
    {
      return {
        category: pattern.category,
        userMessage: pattern.getUserMessage(baseUrl),
        technicalMessage: error.message
      }
    }
  }

  // No pattern matched - return unknown
  return {
    category: 'unknown',
    userMessage: error.message,
    technicalMessage: error.message
  }
}
