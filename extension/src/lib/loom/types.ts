/**
 * Loom Protocol - Type Definitions
 *
 * A lightweight indentation-based protocol for structured data transmission.
 */

/**
 * Loom object type (key-value pairs)
 * Defined before LoomValue to avoid circular reference issues
 */
export type LoomObject = {
  [key: string]: LoomValue
}

/**
 * Supported value types in Loom
 */
export type LoomValue =
  | string
  | number
  | boolean
  | null
  | LoomValue[]
  | LoomObject
  | Record<string, unknown> // Allow any object structure

/**
 * Parser options
 */
export type ParseOptions = {
  /**
   * Allow comments (lines starting with #)
   * @default true
   */
  allowComments?: boolean

  /**
   * Strict mode - fail on invalid syntax
   * @default true
   */
  strict?: boolean

  /**
   * Auto-detect types (numbers, booleans, null)
   * @default true
   */
  inferTypes?: boolean
}

/**
 * Formatter options
 */
export type FormatOptions = {
  /**
   * Number of spaces per indent level
   * @default 2
   */
  indent?: number

  /**
   * Include comments in output
   * @default false
   */
  includeComments?: boolean

  /**
   * Sort object keys alphabetically
   * @default false
   */
  sortKeys?: boolean
}

/**
 * Parse result
 */
export type ParseResult<T = LoomObject> = {
  /**
   * Parsed data
   */
  data: T

  /**
   * Parse errors (if any)
   */
  errors: ParseError[]

  /**
   * Whether parsing was successful
   */
  success: boolean
}

/**
 * Parse error
 */
export type ParseError = {
  /**
   * Line number (1-based)
   */
  line: number

  /**
   * Error message
   */
  message: string

  /**
   * Original line content
   */
  content: string
}

/**
 * Schema definition for validation
 */
export type LoomSchema = {
  [key: string]: LoomFieldSchema
}

/**
 * Field schema
 */
export type LoomFieldSchema = {
  /**
   * Expected type
   */
  type: 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object'

  /**
   * Required field
   * @default false
   */
  required?: boolean

  /**
   * Array item schema (if type is array)
   */
  items?: LoomFieldSchema

  /**
   * Object property schemas (if type is object)
   */
  properties?: LoomSchema

  /**
   * Allowed values (enum)
   */
  enum?: unknown[]

  /**
   * Custom validation function
   */
  validate?: (value: unknown) => boolean | string
}

/**
 * Validation result
 */
export type ValidationResult = {
  /**
   * Whether validation passed
   */
  valid: boolean

  /**
   * Validation errors
   */
  errors: ValidationError[]
}

/**
 * Validation error
 */
export type ValidationError = {
  /**
   * Field path (e.g., "workflow.nodes[0].id")
   */
  path: string

  /**
   * Error message
   */
  message: string
}

