/**
 * Input validation and sanitization utilities.
 * Provides type-safe validation for user inputs and API data.
 */

import { ValidationError } from '../errors'

/**
 * Validate that a value is a non-empty string.
 */
export function validateNonEmptyString(value: unknown, fieldName: string): string
{
  if (typeof value !== 'string')
  {
    throw new ValidationError(`${fieldName} must be a string`, fieldName)
  }

  const trimmed = value.trim()
  if (trimmed.length === 0)
  {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName)
  }

  return trimmed
}

/**
 * Validate OpenAI API key format.
 * OpenAI keys start with "sk-" followed by alphanumeric characters.
 */
export function validateOpenAiKey(key: unknown): string
{
  const trimmed = validateNonEmptyString(key, 'OpenAI API key')

  // Basic format check: should start with sk- or sk-proj-
  if (!trimmed.match(/^sk-[a-zA-Z0-9_-]{20,}$/))
  {
    throw new ValidationError(
      'Invalid OpenAI API key format. Key should start with "sk-" followed by at least 20 characters.',
      'openai_api_key'
    )
  }

  return trimmed
}

/**
 * Validate n8n API key format.
 * n8n keys are typically alphanumeric strings.
 */
export function validateN8nKey(key: unknown): string
{
  const trimmed = validateNonEmptyString(key, 'n8n API key')

  // n8n API keys should be at least 8 characters
  if (trimmed.length < 8)
  {
    throw new ValidationError('n8n API key must be at least 8 characters long.', 'n8n_api_key')
  }

  // Should only contain alphanumeric characters, hyphens, and underscores
  if (!trimmed.match(/^[a-zA-Z0-9_-]+$/))
  {
    throw new ValidationError(
      'n8n API key contains invalid characters. Only alphanumeric, hyphens, and underscores allowed.',
      'n8n_api_key'
    )
  }

  return trimmed
}

/**
 * Validate URL format.
 */
export function validateUrl(url: unknown, fieldName = 'URL'): string
{
  const trimmed = validateNonEmptyString(url, fieldName)

  try
  {
    const parsed = new URL(trimmed)

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol))
    {
      throw new ValidationError(`${fieldName} must use http or https protocol`, fieldName)
    }

    return trimmed
  }
  catch (error)
  {
    if (error instanceof ValidationError) throw error
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName)
  }
}

/**
 * Validate n8n base URL.
 */
export function validateN8nBaseUrl(url: unknown): string
{
  const validated = validateUrl(url, 'n8n Base URL')

  // Remove trailing slash for consistency
  return validated.replace(/\/$/, '')
}

/**
 * Sanitize string for safe display in HTML.
 * Prevents XSS attacks by escaping HTML entities.
 */
export function sanitizeHtml(value: string): string
{
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  return value.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char)
}

/**
 * Sanitize user input for safe use in API calls.
 * Trims whitespace and removes control characters.
 */
export function sanitizeInput(value: string): string
{
  // Trim whitespace
  let sanitized = value.trim()

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  return sanitized
}

/**
 * Validate and sanitize user message for chat.
 */
export function validateChatMessage(message: unknown): string
{
  const validated = validateNonEmptyString(message, 'message')
  const sanitized = sanitizeInput(validated)

  // Check minimum length
  if (sanitized.length < 1)
  {
    throw new ValidationError('Message cannot be empty', 'message')
  }

  // Check maximum length (reasonable limit for chat messages)
  if (sanitized.length > 10000)
  {
    throw new ValidationError('Message is too long (maximum 10,000 characters)', 'message')
  }

  return sanitized
}

/**
 * Validate workflow name.
 */
export function validateWorkflowName(name: unknown): string
{
  const validated = validateNonEmptyString(name, 'workflow name')
  const sanitized = sanitizeInput(validated)

  // Check length constraints
  if (sanitized.length < 1 || sanitized.length > 255)
  {
    throw new ValidationError('Workflow name must be between 1 and 255 characters', 'workflow_name')
  }

  return sanitized
}

/**
 * Validate object has required properties.
 */
export function validateRequiredProperties<T extends Record<string, unknown>>(
  obj: unknown,
  requiredProps: string[],
  objectName = 'object'
): T
{
  if (!obj || typeof obj !== 'object')
  {
    throw new ValidationError(`${objectName} must be an object`)
  }

  const typedObj = obj as Record<string, unknown>

  for (const prop of requiredProps)
  {
    if (!(prop in typedObj))
    {
      throw new ValidationError(`Missing required property: ${prop}`, prop)
    }
  }

  return typedObj as T
}

/**
 * Validate array of items.
 */
export function validateArray<T>(
  value: unknown,
  itemValidator: (item: unknown, index: number) => T,
  fieldName = 'array'
): T[]
{
  if (!Array.isArray(value))
  {
    throw new ValidationError(`${fieldName} must be an array`, fieldName)
  }

  return value.map((item, index) =>
  {
    try
    {
      return itemValidator(item, index)
    }
    catch (error)
    {
      if (error instanceof ValidationError)
      {
        throw new ValidationError(`${fieldName}[${index}]: ${error.message}`, `${fieldName}[${index}]`)
      }
      throw error
    }
  })
}

/**
 * Type guard: check if value is a string.
 */
export function isString(value: unknown): value is string
{
  return typeof value === 'string'
}

/**
 * Type guard: check if value is a number.
 */
export function isNumber(value: unknown): value is number
{
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard: check if value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean
{
  return typeof value === 'boolean'
}

/**
 * Type guard: check if value is an object.
 */
export function isObject(value: unknown): value is Record<string, unknown>
{
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
