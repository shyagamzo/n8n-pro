/**
 * Event Sequence Validation Contracts
 *
 * Defines expected event sequences and validates them at runtime.
 * Development-only feature to catch agent coordination bugs early.
 *
 * **Context**: Runs in background worker context (service worker)
 *
 * **Pattern**: RxJS operators validate event streams against contracts
 *
 * @example
 * ```typescript
 * import { validateSequence, workflowCreationContract } from './event-contracts'
 *
 * const events = collectAgentEvents()
 * const result = validateSequence(events, workflowCreationContract)
 *
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors)
 * }
 * ```
 */

import type { SystemEvent, AgentType } from '@events/types'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Expected event in a sequence
 *
 * Describes what event should occur at this point in the sequence.
 */
export type ExpectedEvent = {
  /**
   * Event domain (agent, workflow, graph, etc.)
   */
  domain: string

  /**
   * Event type (started, completed, created, etc.)
   */
  type: string

  /**
   * Expected agent name (for agent events)
   */
  agent?: AgentType

  /**
   * Expected step name (for graph events)
   */
  step?: string

  /**
   * Whether this event is optional in the sequence
   *
   * `true` = Event may or may not occur (e.g., validator is optional)
   * `false` = Event must occur (e.g., enrichment is required)
   */
  optional?: boolean

  /**
   * Whether this event can occur multiple times
   *
   * `true` = Event can repeat (e.g., tokens streaming)
   * `false` = Event should occur exactly once
   */
  allowMultiple?: boolean
}

/**
 * Event sequence contract
 *
 * Defines the expected sequence of events for a workflow or process.
 */
export type EventSequenceContract = {
  /**
   * Contract name (for logging and debugging)
   */
  name: string

  /**
   * Human-readable description of what this contract validates
   */
  description: string

  /**
   * Ordered sequence of expected events
   */
  sequence: ExpectedEvent[]

  /**
   * Maximum time between events in milliseconds
   *
   * If exceeded, a warning is logged but validation doesn't fail.
   * Useful for detecting performance issues.
   */
  timeout?: number
}

/**
 * Validation result
 *
 * Contains validation outcome, errors, warnings, and actual sequence.
 */
export type ValidationResult = {
  /**
   * Whether validation passed (no errors)
   */
  valid: boolean

  /**
   * Validation errors (missing events, wrong order, etc.)
   */
  errors: string[]

  /**
   * Validation warnings (timeouts, optional events, etc.)
   */
  warnings: string[]

  /**
   * Actual event sequence that was validated
   */
  actualSequence: Array<{
    event: string
    timestamp: number
  }>
}

// ─────────────────────────────────────────────────────────────
// Workflow Creation Contract
// ─────────────────────────────────────────────────────────────

/**
 * Standard workflow creation event sequence contract
 *
 * Validates the happy path for creating a workflow:
 * 1. Enrichment gathers requirements
 * 2. Planner creates plan
 * 3. Validator validates plan (optional)
 * 4. User approves plan
 * 5. Executor creates workflow
 *
 * @example
 * ```typescript
 * const result = validateSequence(events, workflowCreationContract)
 * if (!result.valid) {
 *   console.error('Workflow creation sequence invalid:', result.errors)
 * }
 * ```
 */
export const workflowCreationContract: EventSequenceContract = {
  name: 'workflow-creation',
  description: 'Standard workflow creation flow (enrichment → planner → validator → executor)',
  sequence: [
    // Enrichment phase
    { domain: 'agent', type: 'started', agent: 'enrichment' },
    { domain: 'agent', type: 'completed', agent: 'enrichment' },

    // Planning phase
    { domain: 'agent', type: 'started', agent: 'planner' },
    { domain: 'agent', type: 'completed', agent: 'planner' },

    // Validation phase (optional)
    { domain: 'agent', type: 'started', agent: 'validator', optional: true },
    { domain: 'agent', type: 'completed', agent: 'validator', optional: true },

    // Execution phase
    { domain: 'agent', type: 'started', agent: 'executor' },
    { domain: 'workflow', type: 'created' },
    { domain: 'agent', type: 'completed', agent: 'executor' }
  ],
  timeout: 30000 // 30 seconds max between events
}

/**
 * LangGraph handoff validation contract
 *
 * Validates that agent nodes return to orchestrator, not directly to END.
 * This catches the Phase 1 Bug 1 regression.
 *
 * @example
 * ```typescript
 * const result = validateSequence(graphEvents, graphHandoffContract)
 * if (!result.valid) {
 *   // Agent went directly to END instead of returning to orchestrator
 * }
 * ```
 */
export const graphHandoffContract: EventSequenceContract = {
  name: 'graph-handoff',
  description: 'Agent nodes must handoff to orchestrator, not END',
  sequence: [
    // Orchestrator routes to enrichment
    { domain: 'graph', type: 'handoff', step: 'enrichment' },

    // Enrichment completes, returns to orchestrator
    { domain: 'graph', type: 'handoff', step: 'planner' },

    // Planner completes, returns to orchestrator (not END)
    { domain: 'graph', type: 'handoff', step: 'validator', optional: true },

    // If validator ran, it should return to orchestrator
    { domain: 'graph', type: 'handoff', step: 'executor', optional: true }
  ]
}

// ─────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────

/**
 * Check if event matches expected event specification
 *
 * @param event - Actual event from stream
 * @param expected - Expected event specification
 * @returns `true` if event matches expected pattern
 *
 * @example
 * ```typescript
 * const event = { domain: 'agent', type: 'started', payload: { agent: 'enrichment' } }
 * const expected = { domain: 'agent', type: 'started', agent: 'enrichment' }
 *
 * matchesExpected(event, expected) // true
 * ```
 */
export function matchesExpected(event: SystemEvent, expected: ExpectedEvent): boolean
{
  // Check domain and type
  if (event.domain !== expected.domain) return false
  if (event.type !== expected.type) return false

  // Check agent (if specified)
  if (expected.agent && 'agent' in event.payload)
  {
    if (event.payload.agent !== expected.agent) return false
  }

  // Check step (if specified)
  if (expected.step && 'toStep' in event.payload)
  {
    if (event.payload.toStep !== expected.step) return false
  }

  return true
}

/**
 * Validate event sequence against contract
 *
 * Checks that events occur in the expected order, with proper handling
 * of optional events and timeouts.
 *
 * @param events - Array of events to validate
 * @param contract - Contract specifying expected sequence
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const events = [
 *   { domain: 'agent', type: 'started', payload: { agent: 'enrichment' }, timestamp: 1000 },
 *   { domain: 'agent', type: 'completed', payload: { agent: 'enrichment' }, timestamp: 2000 }
 * ]
 *
 * const result = validateSequence(events, workflowCreationContract)
 * // result.valid === false (missing planner events)
 * // result.errors includes "Missing expected event: agent:started (planner)"
 * ```
 */
export function validateSequence(
  events: SystemEvent[],
  contract: EventSequenceContract
): ValidationResult
{
  const errors: string[] = []
  const warnings: string[] = []
  const actualSequence = events.map(e => ({
    event: formatEvent(e),
    timestamp: e.timestamp
  }))

  let eventIndex = 0
  let contractIndex = 0

  while (contractIndex < contract.sequence.length)
  {
    const expected = contract.sequence[contractIndex]

    // Check timeout between events
    if (eventIndex > 0 && eventIndex < events.length && contract.timeout)
    {
      const timeDiff = events[eventIndex].timestamp - events[eventIndex - 1].timestamp

      if (timeDiff > contract.timeout)
      {
        warnings.push(
          `Timeout exceeded: ${timeDiff}ms between events (max: ${contract.timeout}ms)`
        )
      }
    }

    // Check if we've run out of events
    if (eventIndex >= events.length)
    {
      if (!expected.optional)
      {
        errors.push(
          `Missing expected event: ${expected.domain}:${expected.type}` +
          (expected.agent ? ` (${expected.agent})` : '') +
          (expected.step ? ` (→ ${expected.step})` : '')
        )
      }

      contractIndex++
      continue
    }

    const actual = events[eventIndex]

    // Check if event matches expected
    if (matchesExpected(actual, expected))
    {
      eventIndex++
      contractIndex++
      continue
    }

    // Event doesn't match
    if (expected.optional)
    {
      // Skip optional event and try next expected event
      contractIndex++
      continue
    }

    // Required event doesn't match
    errors.push(
      `Unexpected event: got ${formatEvent(actual)}, expected ${expected.domain}:${expected.type}` +
      (expected.agent ? ` (${expected.agent})` : '') +
      (expected.step ? ` (→ ${expected.step})` : '')
    )

    eventIndex++
  }

  // Check for extra events after sequence completes
  if (eventIndex < events.length)
  {
    const extraCount = events.length - eventIndex
    warnings.push(`${extraCount} extra event(s) after sequence completed`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    actualSequence
  }
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Format event as human-readable string for logging
 *
 * @param event - Event to format
 * @returns Formatted string (e.g., "agent:started (enrichment)")
 */
function formatEvent(event: SystemEvent): string
{
  let formatted = `${event.domain}:${event.type}`

  if ('agent' in event.payload && event.payload.agent)
  {
    formatted += ` (${event.payload.agent})`
  }

  if ('toStep' in event.payload && event.payload.toStep)
  {
    formatted += ` (→ ${event.payload.toStep})`
  }

  return formatted
}
