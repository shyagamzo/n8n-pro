/**
 * Custom error classes for the n8n extension.
 * Provides specific error types for better error handling and user messaging.
 */

/**
 * Base class for all extension errors.
 */
export class ExtensionError extends Error
{
  public readonly code: string
  public readonly context?: Record<string, unknown>

  constructor(message: string, code: string, context?: Record<string, unknown>)
  {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.context = context
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Error type representing HTTP and network failures.
 */
export class ApiError extends ExtensionError
{
  public readonly status: number
  public readonly url: string
  public readonly body?: unknown

  constructor(message: string, status: number, url: string, body?: unknown)
  {
    super(message, 'API_ERROR', { status, url })
    this.status = status
    this.url = url
    this.body = body
  }

  /**
   * Check if error is a client error (4xx).
   */
  public isClientError(): boolean
  {
    return this.status >= 400 && this.status < 500
  }

  /**
   * Check if error is a server error (5xx).
   */
  public isServerError(): boolean
  {
    return this.status >= 500 && this.status < 600
  }

  /**
   * Check if error is retryable.
   */
  public isRetryable(): boolean
  {
    // Retry on server errors, rate limits, and timeouts
    return this.isServerError() || this.status === 429 || this.status === 408
  }
}

/**
 * Error for n8n API specific failures.
 */
export class N8nApiError extends ApiError
{
  constructor(message: string, status: number, url: string, body?: unknown)
  {
    super(message, status, url, body)
    this.name = 'N8nApiError'
    this.code = 'N8N_API_ERROR'
  }

  /**
   * Get user-friendly error message.
   */
  public getUserMessage(): string
  {
    if (this.status === 401 || this.status === 403)
    {
      return 'Authentication failed. Please check your n8n API key in extension settings.'
    }

    if (this.status === 404)
    {
      return 'n8n resource not found. Please check your n8n instance.'
    }

    if (this.status === 429)
    {
      return 'Rate limit exceeded. Please wait a moment and try again.'
    }

    if (this.isServerError())
    {
      return 'n8n server error. Please check your n8n instance.'
    }

    return 'Failed to communicate with n8n. Please check your connection.'
  }
}

/**
 * Error for OpenAI API specific failures.
 */
export class OpenAiApiError extends ApiError
{
  constructor(message: string, status: number, url: string, body?: unknown)
  {
    super(message, status, url, body)
    this.name = 'OpenAiApiError'
    this.code = 'OPENAI_API_ERROR'
  }

  /**
   * Get user-friendly error message.
   */
  public getUserMessage(): string
  {
    if (this.status === 401)
    {
      return 'OpenAI authentication failed. Please check your API key in extension settings.'
    }

    if (this.status === 429)
    {
      return 'OpenAI rate limit exceeded. Please wait a moment and try again.'
    }

    if (this.status === 500 || this.status === 503)
    {
      return 'OpenAI service temporarily unavailable. Please try again later.'
    }

    return 'Failed to communicate with OpenAI. Please check your connection.'
  }
}

/**
 * Error for validation failures.
 */
export class ValidationError extends ExtensionError
{
  public readonly field?: string

  constructor(message: string, field?: string, context?: Record<string, unknown>)
  {
    super(message, 'VALIDATION_ERROR', { ...context, field })
    this.field = field
  }

  /**
   * Get user-friendly error message.
   */
  public getUserMessage(): string
  {
    if (this.field)
    {
      return `Invalid ${this.field}: ${this.message}`
    }
    return `Validation error: ${this.message}`
  }
}

/**
 * Error for configuration issues.
 */
export class ConfigurationError extends ExtensionError
{
  constructor(message: string, context?: Record<string, unknown>)
  {
    super(message, 'CONFIGURATION_ERROR', context)
  }

  /**
   * Get user-friendly error message.
   */
  public getUserMessage(): string
  {
    return `Configuration error: ${this.message}. Please check extension settings.`
  }
}

/**
 * Error for agent/orchestrator failures.
 */
export class AgentError extends ExtensionError
{
  public readonly agent?: string

  constructor(message: string, agent?: string, context?: Record<string, unknown>)
  {
    super(message, 'AGENT_ERROR', { ...context, agent })
    this.agent = agent
  }

  /**
   * Get user-friendly error message.
   */
  public getUserMessage(): string
  {
    return 'Failed to process your request. Please try rephrasing or simplifying your request.'
  }
}

/**
 * Check if error has user-friendly message.
 */
export function hasUserMessage(error: unknown): error is { getUserMessage(): string }
{
  return (
    typeof error === 'object' &&
    error !== null &&
    'getUserMessage' in error &&
    typeof (error as { getUserMessage: unknown }).getUserMessage === 'function'
  )
}

/**
 * Get user-friendly error message from any error.
 */
export function getUserErrorMessage(error: unknown): string
{
  if (hasUserMessage(error))
  {
    return error.getUserMessage()
  }

  if (error instanceof Error)
  {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}
