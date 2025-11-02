// ─────────────────────────────────────────────────────────────
// Zod Error Formatting for n8n Workflows
// ─────────────────────────────────────────────────────────────
//
// This module converts Zod validation errors into actionable ValidationError
// objects with clear messages and fix suggestions.
//
// **Key Features:**
// 1. Converts Zod path arrays to human-readable field names
// 2. Provides context-aware fix suggestions
// 3. Maintains existing ValidationError format for backward compatibility
// 4. Groups related errors for clarity
//
// ─────────────────────────────────────────────────────────────

import type { ZodError, ZodIssue } from 'zod'
import type { ValidationError } from './validation.types'

// ─────────────────────────────────────────────────────────────
// Zod Error Conversion
// ─────────────────────────────────────────────────────────────

/**
 * Convert a Zod path array to a human-readable field name
 *
 * Examples:
 * - ["nodes", 0, "name"] → "nodes[0].name"
 * - ["connections", "HTTP Request", "main"] → "connections.HTTP Request.main"
 * - ["name"] → "name"
 */
function formatFieldPath(path: Array<string | number>): string
{
  if (path.length === 0)
  {
    return 'workflow'
  }

  return path.reduce<string>((acc, segment, index) => {
    if (index === 0)
    {
      return String(segment)
    }

    if (typeof segment === 'number')
    {
      return `${acc}[${segment}]`
    }

    return `${acc}.${segment}`
  }, '')
}

/**
 * Generate context-aware fix suggestions based on error type and field
 */
function generateFixSuggestion(issue: ZodIssue): string | undefined
{
  const { code, path } = issue
  const field = formatFieldPath(path)

  // Name validation
  if (field === 'name')
  {
    if (code === 'too_small')
    {
      return 'Add "name: Workflow Title" to the workflow definition'
    }
    if (code === 'too_big')
    {
      return 'Shorten the workflow name to 128 characters or less'
    }
  }

  // Node-level errors
  if (field.startsWith('nodes['))
  {
    const nodeMatch = field.match(/nodes\[(\d+)\]\.?(.*)/)
    if (nodeMatch)
    {
      const [, , subfield] = nodeMatch

      if (!subfield || subfield === '')
      {
        return 'Check node structure in Loom format'
      }

      if (subfield === 'type')
      {
        return 'Add "type: n8n-nodes-base.nodeName" to node definition'
      }

      if (subfield === 'name')
      {
        return 'Ensure all node names are unique within the workflow'
      }

      if (subfield === 'position')
      {
        return 'Use format: position: [250, 300]'
      }
    }
  }

  // Position errors
  if (field.includes('position'))
  {
    return 'Use format: position: [x, y] with numeric values'
  }

  // Connection errors
  if (field.startsWith('connections.'))
  {
    if (field.includes('.node'))
    {
      return 'Ensure target node name matches a node in the workflow'
    }

    if (field.includes('.main'))
    {
      return 'Use format: main: [[{ node: "Target", type: "main", index: 0 }]]'
    }

    return 'Ensure connection keys match node names exactly'
  }

  // Nodes array errors
  if (field === 'nodes')
  {
    if (code === 'too_small')
    {
      return 'Workflow must contain at least one node'
    }

    if (issue.message.includes('unique'))
    {
      return 'Ensure all node names are unique within the workflow'
    }

    return 'Ensure workflow has "nodes:" section with array of nodes'
  }

  // Generic fallback
  return undefined
}

/**
 * Convert a single ZodIssue to a ValidationError
 */
function zodIssueToValidationError(issue: ZodIssue): ValidationError
{
  const field = formatFieldPath(issue.path)
  const message = issue.message
  const fix = generateFixSuggestion(issue)

  return {
    field,
    message,
    ...(fix && { fix })
  }
}

/**
 * Convert ZodError to array of ValidationError objects
 *
 * This is the main entry point for error conversion.
 *
 * @param zodError - ZodError from schema.safeParse()
 * @returns Array of ValidationError objects with actionable messages
 *
 * @example
 * ```typescript
 * const result = WorkflowSchema.safeParse(data)
 * if (!result.success) {
 *   const errors = formatZodErrors(result.error)
 *   return { success: false, errors }
 * }
 * ```
 */
export function formatZodErrors(zodError: ZodError): ValidationError[]
{
  return zodError.issues.map(zodIssueToValidationError)
}

// ─────────────────────────────────────────────────────────────
// Error Deduplication
// ─────────────────────────────────────────────────────────────

/**
 * Deduplicate validation errors by field
 *
 * When multiple errors occur on the same field, keep only the first one
 * to avoid overwhelming the user with redundant messages.
 *
 * @param errors - Array of ValidationError objects
 * @returns Deduplicated array
 */
export function deduplicateErrors(errors: ValidationError[]): ValidationError[]
{
  const seen = new Set<string>()
  const deduplicated: ValidationError[] = []

  for (const error of errors)
  {
    if (!seen.has(error.field))
    {
      seen.add(error.field)
      deduplicated.push(error)
    }
  }

  return deduplicated
}

// ─────────────────────────────────────────────────────────────
// Error Sorting
// ─────────────────────────────────────────────────────────────

/**
 * Sort validation errors by logical order for better UX
 *
 * Order:
 * 1. Workflow-level errors (name, active, etc.)
 * 2. Nodes array errors
 * 3. Individual node errors (by index)
 * 4. Connection errors
 * 5. Settings errors
 *
 * @param errors - Array of ValidationError objects
 * @returns Sorted array
 */
export function sortValidationErrors(errors: ValidationError[]): ValidationError[]
{
  const order = ['workflow', 'name', 'active', 'nodes', 'connections', 'settings']

  return [...errors].sort((a, b) => {
    // Extract base field name
    const fieldA = a.field.split(/[.[]/)[0]
    const fieldB = b.field.split(/[.[]/)[0]

    // Get order indices
    const indexA = order.indexOf(fieldA)
    const indexB = order.indexOf(fieldB)

    // If both are in order array, use that order
    if (indexA !== -1 && indexB !== -1)
    {
      return indexA - indexB
    }

    // If only one is in order array, prioritize it
    if (indexA !== -1)
    {
      return -1
    }
    if (indexB !== -1)
    {
      return 1
    }

    // Both are custom fields, sort alphabetically
    return a.field.localeCompare(b.field)
  })
}

// ─────────────────────────────────────────────────────────────
// Complete Error Processing Pipeline
// ─────────────────────────────────────────────────────────────

/**
 * Process ZodError through complete formatting pipeline
 *
 * Steps:
 * 1. Convert ZodIssues to ValidationErrors
 * 2. Deduplicate by field
 * 3. Sort by logical order
 *
 * @param zodError - ZodError from schema validation
 * @returns Clean, sorted, deduplicated ValidationError array
 *
 * @example
 * ```typescript
 * const result = WorkflowSchema.safeParse(data)
 * if (!result.success) {
 *   const errors = processZodError(result.error)
 *   return { success: false, errors }
 * }
 * ```
 */
export function processZodError(zodError: ZodError): ValidationError[]
{
  const formatted = formatZodErrors(zodError)
  const deduplicated = deduplicateErrors(formatted)
  const sorted = sortValidationErrors(deduplicated)

  return sorted
}
