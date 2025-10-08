import type { ValidationResult, ValidationError } from '../orchestrator/validator'
import type { Plan } from '../types/plan'

export type ValidationLogEntry = {
  timestamp: string
  workflowName: string
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  plannerOutput: Plan
  validatorDecision: 'pass' | 'retry' | 'fail'
  retryCount: number
  sessionId?: string
}

/**
 * Log validation results for debugging and analysis
 */
export function logValidation(entry: Omit<ValidationLogEntry, 'timestamp'>): void
{
  const logEntry: ValidationLogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  }

  // Log to console with formatting
  if (!logEntry.valid)
  {
    console.warn('⚠️ Workflow validation failed:', {
      workflow: logEntry.workflowName,
      errors: logEntry.errors.length,
      warnings: logEntry.warnings.length,
      decision: logEntry.validatorDecision,
      retryCount: logEntry.retryCount
    })

    // Log each error
    logEntry.errors.forEach((error, idx) =>
    {
      console.error(`  Error ${idx + 1}:`, {
        severity: error.severity,
        category: error.category,
        node: error.nodeName || error.nodeId,
        field: error.field,
        expected: error.expected,
        actual: error.actual,
        suggestion: error.suggestion
      })
    })

    // Log each warning
    logEntry.warnings.forEach((warning, idx) =>
    {
      console.warn(`  Warning ${idx + 1}:`, {
        severity: warning.severity,
        category: warning.category,
        node: warning.nodeName || warning.nodeId,
        field: warning.field,
        message: warning.suggestion
      })
    })
  }
  else
  {
    console.info('✅ Workflow validation passed:', {
      workflow: logEntry.workflowName,
      warnings: logEntry.warnings.length
    })
  }

  // Store in chrome.storage.local for later analysis
  void storeValidationLog(logEntry)
}

/**
 * Store validation log in chrome.storage for debugging
 */
async function storeValidationLog(entry: ValidationLogEntry): Promise<void>
{
  try
  {
    // Get existing logs
    const result = await chrome.storage.local.get('validationLogs')
    const logs = (result.validationLogs as ValidationLogEntry[]) || []

    // Add new log
    logs.push(entry)

    // Keep only last 50 logs
    const trimmedLogs = logs.slice(-50)

    // Save back
    await chrome.storage.local.set({ validationLogs: trimmedLogs })
  }
  catch (error)
  {
    console.error('Failed to store validation log:', error)
  }
}

/**
 * Get all validation logs from storage
 */
export async function getValidationLogs(): Promise<ValidationLogEntry[]>
{
  try
  {
    const result = await chrome.storage.local.get('validationLogs')
    return (result.validationLogs as ValidationLogEntry[]) || []
  }
  catch (error)
  {
    console.error('Failed to retrieve validation logs:', error)
    return []
  }
}

/**
 * Clear all validation logs
 */
export async function clearValidationLogs(): Promise<void>
{
  try
  {
    await chrome.storage.local.remove('validationLogs')
    console.info('Validation logs cleared')
  }
  catch (error)
  {
    console.error('Failed to clear validation logs:', error)
  }
}

/**
 * Get validation statistics
 */
export async function getValidationStats(): Promise<{
  total: number
  passed: number
  failed: number
  retried: number
  commonErrors: Record<string, number>
  commonNodeTypeErrors: string[]
}>
{
  const logs = await getValidationLogs()

  const stats = {
    total: logs.length,
    passed: 0,
    failed: 0,
    retried: 0,
    commonErrors: {} as Record<string, number>,
    commonNodeTypeErrors: [] as string[]
  }

  const nodeTypeErrors = new Map<string, number>()

  for (const log of logs)
  {
    if (log.valid)
    {
      stats.passed++
    }
    else
    {
      stats.failed++
    }

    if (log.retryCount > 0)
    {
      stats.retried++
    }

    // Count error categories
    for (const error of log.errors)
    {
      const key = `${error.category}:${error.field}`
      stats.commonErrors[key] = (stats.commonErrors[key] || 0) + 1

      // Track node type errors specifically
      if (error.category === 'node_type' && error.actual)
      {
        nodeTypeErrors.set(error.actual, (nodeTypeErrors.get(error.actual) || 0) + 1)
      }
    }
  }

  // Get top 10 most common node type errors
  stats.commonNodeTypeErrors = Array.from(nodeTypeErrors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nodeType]) => nodeType)

  return stats
}

/**
 * Format validation result as user-friendly message
 */
export function formatValidationErrors(result: ValidationResult): string
{
  if (result.valid) return 'Validation passed'

  const errors = result.errors || []
  const warnings = result.warnings || []

  let message = '**Validation Issues:**\n\n'

  // Critical errors
  if (errors.length > 0)
  {
    message += '**Errors:**\n'
    errors.forEach((error, idx) =>
    {
      message += `${idx + 1}. **${error.nodeName || error.nodeId || 'Workflow'}** - ${error.category}\n`
      message += `   - ${error.suggestion}\n`

      if (error.availableAlternatives && error.availableAlternatives.length > 0)
      {
        message += `   - Alternatives: ${error.availableAlternatives.slice(0, 3).join(', ')}\n`
      }

      message += '\n'
    })
  }

  // Warnings
  if (warnings.length > 0)
  {
    message += '\n**Warnings:**\n'
    warnings.forEach((warning, idx) =>
    {
      message += `${idx + 1}. **${warning.nodeName || warning.nodeId || 'Workflow'}** - ${warning.suggestion}\n`
    })
  }

  return message
}

/**
 * Export validation logs as JSON for analysis
 */
export async function exportValidationLogs(): Promise<string>
{
  const logs = await getValidationLogs()
  const stats = await getValidationStats()

  return JSON.stringify({
    exportDate: new Date().toISOString(),
    stats,
    logs
  }, null, 2)
}

