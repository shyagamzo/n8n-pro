/**
 * Debug logging utilities
 *
 * Structured logging for development with colored console output
 * and automatic sanitization of sensitive data.
 */

// type LogLevel = 'debug' | 'info' | 'warn' | 'error' // Unused for now

type LogContext = {
  component: string
  action: string
  data?: unknown
  error?: Error | unknown
}

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Sanitize sensitive data from logs
 */
function sanitize(data: unknown): unknown
{
  if (!data) return data

  if (typeof data === 'string')
  {
    // Mask API keys (keep first 4 and last 4 chars)
    if (data.startsWith('sk-') && data.length > 20)
    {
      return `sk-***${data.slice(-4)}`
    }
    return data
  }

  if (Array.isArray(data))
  {
    return data.map(item => sanitize(item))
  }

  if (typeof data === 'object')
  {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>))
    {
      // Mask API key fields
      if (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('api_key'))
      {
        sanitized[key] = typeof value === 'string' && value.length > 8
          ? `***${value.slice(-4)}`
          : '***'
      }
      // Mask token fields
      else if (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret'))
      {
        sanitized[key] = '***'
      }
      else
      {
        sanitized[key] = sanitize(value)
      }
    }
    return sanitized
  }

  return data
}

/**
 * Log a debug message with context
 */
export function debug(context: LogContext): void
{
  if (!isDevelopment) return

  const { component, action, data, error } = context
  const prefix = `[${component}]`

  console.group(`%c${prefix} ${action}`, 'color: #6366f1; font-weight: bold')

  if (data)
  {
    console.log('%cData:', 'color: #8b5cf6', sanitize(data))
  }

  if (error)
  {
    console.error('%cError:', 'color: #ef4444', error)
    if (error instanceof Error && error.stack)
    {
      console.log('%cStack:', 'color: #f97316', error.stack)
    }
  }

  console.groupEnd()
}

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
 * Log LLM response
 */
export function debugLLMResponse(response: string, prompt?: string): void
{
  debug({
    component: 'Orchestrator',
    action: 'LLM response received',
    data: {
      responseLength: response.length,
      responsePreview: response.slice(0, 200) + (response.length > 200 ? '...' : ''),
      promptLength: prompt?.length,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log Loom parsing
 */
export function debugLoomParsing(loomText: string, parsed: unknown, success: boolean): void
{
  debug({
    component: 'Orchestrator',
    action: success ? 'Loom parsing succeeded' : 'Loom parsing failed',
    data: {
      loomLength: loomText.length,
      loomPreview: loomText.slice(0, 200) + (loomText.length > 200 ? '...' : ''),
      parsed: success ? sanitize(parsed) : undefined,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log plan generation
 */
export function debugPlanGenerated(plan: unknown): void
{
  debug({
    component: 'Orchestrator',
    action: 'Plan generated',
    data: {
      plan: sanitize(plan),
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

/**
 * Log validation result
 */
export function debugValidation(workflow: unknown, valid: boolean, errors?: unknown[], warnings?: unknown[]): void
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
 * Create a debug session logger for tracking related operations
 */
export class DebugSession
{
  private readonly sessionId: string
  private readonly startTime: number
  private logs: Array<{ timestamp: number; message: string; data?: unknown }> = []

  constructor(component: string, action: string)
  {
    this.sessionId = `${component}-${action}-${Date.now()}`
    this.startTime = Date.now()
    this.log('Session started')
  }

  public log(message: string, data?: unknown): void
  {
    this.logs.push({
      timestamp: Date.now() - this.startTime,
      message,
      data: data ? sanitize(data) : undefined
    })
  }

  public end(success: boolean): void
  {
    const duration = Date.now() - this.startTime
    this.log(`Session ended: ${success ? 'SUCCESS' : 'FAILURE'} (${duration}ms)`)

    if (isDevelopment)
    {
      console.group(`%c[Session] ${this.sessionId}`, 'color: #8b5cf6; font-weight: bold')
      this.logs.forEach(log =>
      {
        console.log(`%c+${log.timestamp}ms`, 'color: #6b7280', log.message, log.data || '')
      })
      console.groupEnd()
    }
  }

  public getSessionId(): string
  {
    return this.sessionId
  }

  public getLogs(): Array<{ timestamp: number; message: string; data?: unknown }>
  {
    return [...this.logs]
  }
}

/**
 * Agent-specific debug logging
 */
export type AgentType = 'classifier' | 'enrichment' | 'planner' | 'executor' | 'orchestrator'

/**
 * Log an agent decision
 */
export function debugAgentDecision(
  agent: AgentType,
  decision: string,
  reasoning?: string,
  metadata?: unknown
): void
{
  debug({
    component: `Agent:${agent}`,
    action: 'Decision',
    data: {
      decision,
      reasoning,
      metadata: metadata ? sanitize(metadata) : undefined,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log an agent handoff
 */
export function debugAgentHandoff(
  from: AgentType,
  to: AgentType,
  reason: string,
  context?: unknown
): void
{
  if (isDevelopment)
  {
    console.log(
      `%c🔄 [${from.toUpperCase()} → ${to.toUpperCase()}]`,
      'color: #f59e0b; font-weight: bold',
      reason
    )
    if (context)
    {
      console.log('%cContext:', 'color: #8b5cf6', sanitize(context))
    }
  }
}

/**
 * Log agent workflow summary
 */
export function debugAgentWorkflow(agents: AgentType[], totalDuration: number): void
{
  if (!isDevelopment) return

  const flow = agents.map(a => a.toUpperCase()).join(' → ')
  console.group(`%c🔀 Agent Workflow`, 'color: #3b82f6; font-weight: bold')
  console.log(`%cFlow: ${flow}`, 'color: #6366f1')
  console.log(`%cDuration: ${totalDuration}ms`, 'color: #6b7280')
  console.groupEnd()
}

/**
 * Log agent performance metrics
 */
export function debugAgentMetrics(metrics: {
  agent: AgentType
  llmCalls: number
  totalTokens?: number
  duration: number
}): void
{
  debug({
    component: `Agent:${metrics.agent}`,
    action: 'Metrics',
    data: {
      llmCalls: metrics.llmCalls,
      totalTokens: metrics.totalTokens,
      durationMs: metrics.duration,
      timestamp: new Date().toISOString()
    }
  })
}

