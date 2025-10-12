/**
 * Workflow validation utilities
 *
 * Validates workflow structure before sending to n8n API
 * to catch common issues early with actionable feedback.
 */

import { schema, validate as loomValidate } from '@loom'
import type { LoomValue } from '@loom'

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export type ValidationError = {
  field: string
  message: string
  severity: 'error'
}

export type ValidationWarning = {
  field: string
  message: string
  severity: 'warning'
}

type WorkflowNode = {
  id?: string
  name?: string
  type?: string
  parameters?: unknown
  position?: [number, number] | number[]
  credentials?: Record<string, unknown>
}

type WorkflowStructure = {
  name?: string
  nodes?: unknown[]
  connections?: Record<string, unknown>
  settings?: Record<string, unknown>
}

/**
 * Define workflow schema using Loom validator
 */
const workflowSchema = schema()
  .field('name', 'string').required()
  .field('nodes', 'array').required()
  .field('connections', 'object')
  .field('settings', 'object')
  .build()

const nodeSchema = schema()
  .field('id', 'string')
  .field('name', 'string').required()
  .field('type', 'string').required()
  .field('parameters', 'object')
  .field('position', 'array')
  .field('credentials', 'object')
  .build()

/**
 * Validate workflow structure before sending to n8n API
 */
export function validateWorkflow(workflow: unknown): ValidationResult
{
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Use Loom validator for basic structure
  const loomResult = loomValidate(workflow as LoomValue, workflowSchema)

  if (!loomResult.valid)
  {
    // Convert Loom errors to our error format
    loomResult.errors.forEach(err =>
    {
      errors.push({
        field: err.path,
        message: err.message,
        severity: 'error'
      })
    })
  }

  // Additional workflow-specific validations
  if (workflow && typeof workflow === 'object')
  {
    const wf = workflow as WorkflowStructure

    // Check workflow name is not empty
    if (wf.name && typeof wf.name === 'string' && wf.name.trim().length === 0)
    {
      errors.push({
        field: 'workflow.name',
        message: 'Workflow name cannot be empty',
        severity: 'error'
      })
    }

    // Validate nodes array has at least one node
    if (Array.isArray(wf.nodes))
    {
      if (wf.nodes.length === 0)
      {
        errors.push({
          field: 'workflow.nodes',
          message: 'Workflow must have at least one node',
          severity: 'error'
        })
      }
      else
      {
        // Validate each node
        wf.nodes.forEach((node, idx) =>
        {
          if (!node || typeof node !== 'object')
          {
            errors.push({
              field: `workflow.nodes[${idx}]`,
              message: `Node at index ${idx} must be an object`,
              severity: 'error'
            })
            return
          }

          const n = node as WorkflowNode

          // Validate node structure using schema
          const nodeResult = loomValidate(node as LoomValue, nodeSchema)

          if (!nodeResult.valid)
          {
            nodeResult.errors.forEach(err =>
            {
              errors.push({
                field: err.path.replace('$', `workflow.nodes[${idx}]`),
                message: err.message,
                severity: 'error'
              })
            })
          }

          // Additional node validations (warnings)
          if (!n.id)
          {
            warnings.push({
              field: `workflow.nodes[${idx}].id`,
              message: `Node at index ${idx} missing id (n8n may auto-generate)`,
              severity: 'warning'
            })
          }

          if (n.type && !n.type.includes('.'))
          {
            warnings.push({
              field: `workflow.nodes[${idx}].type`,
              message: `Node type "${n.type}" should be in format "n8n-nodes-base.nodeName"`,
              severity: 'warning'
            })
          }

          if (!n.parameters)
          {
            warnings.push({
              field: `workflow.nodes[${idx}].parameters`,
              message: `Node "${n.name || idx}" missing parameters`,
              severity: 'warning'
            })
          }

          if (!n.position || !Array.isArray(n.position) || n.position.length !== 2)
          {
            warnings.push({
              field: `workflow.nodes[${idx}].position`,
              message: `Node "${n.name || idx}" missing or invalid position [x, y]`,
              severity: 'warning'
            })
          }
        })
      }
    }

    // Validate connections
    if (!wf.connections || typeof wf.connections !== 'object')
    {
      warnings.push({
        field: 'workflow.connections',
        message: 'Workflow connections should be an object',
        severity: 'warning'
      })
    }
    else if (Object.keys(wf.connections).length === 0 && Array.isArray(wf.nodes) && wf.nodes.length > 1)
    {
      warnings.push({
        field: 'workflow.connections',
        message: 'Workflow has multiple nodes but no connections defined',
        severity: 'warning'
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Format validation result as user-friendly message
 */
export function formatValidationResult(result: ValidationResult): string
{
  if (result.valid && result.warnings.length === 0)
  {
    return '✅ Workflow structure is valid'
  }

  const lines: string[] = []

  if (result.errors.length > 0)
  {
    lines.push('❌ **Validation Errors:**')
    result.errors.forEach(err =>
    {
      lines.push(`  - **${err.field}**: ${err.message}`)
    })
  }

  if (result.warnings.length > 0)
  {
    lines.push('')
    lines.push('⚠️ **Warnings:**')
    result.warnings.forEach(warn =>
    {
      lines.push(`  - **${warn.field}**: ${warn.message}`)
    })
  }

  return lines.join('\n')
}

