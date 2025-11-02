/**
 * Debug Utilities
 *
 * Structured logging for development with colored console output
 * and automatic sanitization of sensitive data.
 *
 * Organized into focused modules:
 * - sanitize: Data sanitization
 * - logger: Core debug logging
 * - workflow-logger: Workflow-specific logging
 * - llm-logger: LLM interaction logging
 * - agent-logger: Multi-agent logging
 */

// Core logging
export { debug, DebugSession } from './logger'
export type { LogContext } from './logger'

// Data sanitization
export { sanitize } from './sanitize'

// Workflow logging
export {
  debugWorkflowCreation,
  debugWorkflowCreated,
  debugWorkflowError,
  debugValidation,
  debugN8nApiError
} from './workflow-logger'

// LLM logging
export {
  debugLLMResponse,
  debugLoomParsing,
  debugPlanGenerated
} from './llm-logger'

// Agent logging
export {
  debugAgentDecision,
  debugAgentHandoff,
  debugAgentWorkflow,
  debugAgentMetrics
} from './agent-logger'

// Re-export AgentType for convenience
export type { AgentType } from '@shared/types/messaging'
