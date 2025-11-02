/**
 * Type definitions for workflow validation
 *
 * Extracted to prevent circular dependencies between:
 * - validation-errors.ts (error formatting)
 * - workflow-builder.ts (workflow validation)
 */

import type { N8nWorkflow } from './types'

export type ValidationError = {
  field: string
  message: string
  fix?: string
}

export type ValidationResult =
  | { success: true; workflow: N8nWorkflow }
  | { success: false; errors: ValidationError[] }
