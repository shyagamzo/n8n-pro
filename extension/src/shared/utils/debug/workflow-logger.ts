/**
 * Workflow Debug Logging
 *
 * Specialized logging functions for workflow creation and validation.
 */

import { debug } from './logger'
import { sanitize } from './sanitize'

/**
 * Log workflow creation attempt
 */
export function debugWorkflowCreation(workflow: unknown): void
{
  debug({
    component: 'WorkflowCreation',
    action: 'Attempting to create workflow',
    data: {
      workflow: sanitize(workflow),
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log workflow creation success
 */
export function debugWorkflowCreated(workflowId: string, url: string): void
{
  debug({
    component: 'WorkflowCreation',
    action: 'Workflow created successfully',
    data: {
      workflowId,
      url,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log workflow creation failure
 */
export function debugWorkflowError(error: unknown, workflow?: unknown): void
{
  debug({
    component: 'WorkflowCreation',
    action: 'Workflow creation failed',
    data: {
      workflow: workflow ? sanitize(workflow) : undefined,
      timestamp: new Date().toISOString()
    },
    error
  })
}

/**
 * Log validation result
 */
export function debugValidation(
  workflow: unknown,
  valid: boolean,
  errors?: unknown[],
  warnings?: unknown[]
): void
{
  debug({
    component: 'Validation',
    action: valid ? 'Validation passed' : 'Validation failed',
    data: {
      valid,
      errorCount: errors?.length || 0,
      warningCount: warnings?.length || 0,
      errors: errors || [],
      warnings: warnings || [],
      workflowPreview: sanitize(workflow),
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log n8n API error
 */
export function debugN8nApiError(endpoint: string, status: number, error: unknown): void
{
  debug({
    component: 'N8nAPI',
    action: 'API request failed',
    data: {
      endpoint,
      status,
      timestamp: new Date().toISOString()
    },
    error
  })
}
