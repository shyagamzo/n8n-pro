/**
 * Workflow Builder - n8n Workflow Validation & Normalization
 *
 * This module provides the critical validation layer between Loom parser output
 * and n8n API submission. It ensures workflows match n8n's strict UI requirements,
 * not just the minimal API validation.
 *
 * **Why This Exists:**
 * - n8n API has minimal validation (accepts malformed workflows)
 * - n8n UI has strict validation (rejects malformed workflows)
 * - Loom parser is generic (no n8n domain knowledge)
 * - LLM output cannot be trusted (requires validation)
 *
 * **What It Does:**
 * 1. Validates workflow structure against n8n requirements
 * 2. Normalizes ambiguous structures (single → double-nested arrays)
 * 3. Adds required defaults (typeVersion, settings, active, UUIDs)
 * 4. Provides clear, actionable error messages
 * 5. Fails fast before wasting API calls
 *
 * **Architecture:**
 * ```
 * Planner (LLM) → Loom Parser → WorkflowBuilder → n8n API
 *                 (generic)      (n8n-specific)
 * ```
 *
 * **Refactored:** This module now uses Zod schemas for validation instead of
 * manual type checks. This provides better error messages, automatic normalization,
 * and stronger type safety.
 */

import type { N8nWorkflow } from './types'
import { WorkflowWithConnectionValidationSchema } from './schemas'
import { processZodError } from './validation-errors'

// ─────────────────────────────────────────────────────────────
// Validation Error Types
// ─────────────────────────────────────────────────────────────

export type ValidationError = {
  field: string
  message: string
  fix?: string
}

export type ValidationResult =
  | { success: true; workflow: N8nWorkflow }
  | { success: false; errors: ValidationError[] }

// ─────────────────────────────────────────────────────────────
// Workflow Builder Class
// ─────────────────────────────────────────────────────────────

/**
 * Builds and validates n8n workflows from untrusted Loom data.
 *
 * This is the ONLY component that should create n8n workflows from external data.
 * It ensures structural correctness before API submission.
 *
 * **Implementation:** Uses Zod schemas for validation and normalization.
 * All validation logic is now declarative and type-safe.
 */
export class WorkflowBuilder
{
  /**
   * Build and validate an n8n workflow from Loom parser output.
   *
   * This is the main entry point for workflow creation. It validates
   * structure, normalizes ambiguous data, and adds required defaults.
   *
   * **Validation Steps:**
   * 1. Parse workflow structure with Zod schema
   * 2. Normalize arrays (single-nested → double-nested)
   * 3. Generate missing UUIDs
   * 4. Add default values (typeVersion, settings, active)
   * 5. Validate cross-field constraints (node names, connections)
   * 6. Format errors with actionable fix suggestions
   *
   * @param loomData - Parsed Loom data (untrusted LLM output)
   * @returns Validated workflow OR detailed errors
   *
   * @example
   * ```typescript
   * const result = WorkflowBuilder.build(loomData)
   * if (!result.success) {
   *   console.error('Validation failed:', result.errors)
   *   return
   * }
   * const workflow = result.workflow
   * await n8n.createWorkflow(workflow)
   * ```
   */
  static build(loomData: unknown): ValidationResult
  {
    // Preprocess workflow data to fix common Loom parser issues
    const preprocessed = this.preprocessWorkflowData(loomData)

    // Validate using Zod schema with connection validation
    const result = WorkflowWithConnectionValidationSchema.safeParse(preprocessed)

    if (!result.success)
    {
      // Convert Zod errors to ValidationError format
      const errors = processZodError(result.error)
      return { success: false, errors }
    }

    // Return validated and normalized workflow
    return { success: true, workflow: result.data }
  }

  /**
   * Preprocess workflow data to fix common Loom parser issues
   *
   * This handles cases where the LLM generates malformed Loom that the parser
   * misinterprets. Common issues:
   * - Keys with "- " prefix (e.g., "- node" instead of "node")
   * - Malformed connection structures
   *
   * @param data - Raw parsed Loom data
   * @returns Cleaned workflow data
   */
  private static preprocessWorkflowData(data: unknown): unknown
  {
    if (typeof data !== 'object' || data === null)
    {
      return data
    }

    const workflow = data as Record<string, unknown>

    // Fix connection keys with "- " prefix
    if (workflow.connections && typeof workflow.connections === 'object')
    {
      workflow.connections = this.fixConnectionKeys(workflow.connections as Record<string, unknown>)
    }

    return workflow
  }

  /**
   * Fix malformed connection keys
   *
   * Recursively walks through connection objects and fixes keys that have
   * "- " prefix (e.g., "- node" → "node")
   */
  private static fixConnectionKeys(obj: Record<string, unknown>): Record<string, unknown>
  {
    const fixed: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj))
    {
      // Fix key if it starts with "- "
      const cleanKey = key.startsWith('- ') ? key.slice(2) : key

      // Recursively fix nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value))
      {
        fixed[cleanKey] = this.fixConnectionKeys(value as Record<string, unknown>)
      }
      // Recursively fix arrays of objects
      else if (Array.isArray(value))
      {
        fixed[cleanKey] = value.map(item =>
          typeof item === 'object' && item !== null && !Array.isArray(item)
            ? this.fixConnectionKeys(item as Record<string, unknown>)
            : item
        )
      }
      // Simple value
      else
      {
        fixed[cleanKey] = value
      }
    }

    return fixed
  }
}
