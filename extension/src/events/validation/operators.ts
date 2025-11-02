/**
 * RxJS Operators for Event Validation
 *
 * Custom operators that validate event sequences in real-time.
 * Development-only feature to catch agent coordination bugs early.
 *
 * **Context**: Runs in background worker context (service worker)
 *
 * **Pattern**: RxJS operators transform and validate event streams
 *
 * @example
 * ```typescript
 * import { validateEventSequence, validateGraphHandoffs } from './operators'
 * import { workflowCreationContract } from './event-contracts'
 *
 * // Validate workflow creation sequence
 * systemEvents.agent$.pipe(
 *   validateEventSequence(workflowCreationContract)
 * ).subscribe()
 * ```
 */

import { Observable, type OperatorFunction } from 'rxjs'
import { tap, scan, filter } from 'rxjs/operators'

import type { SystemEvent, AgentEvent, GraphEvent } from '@events/types'
import type { EventSequenceContract } from './event-contracts'
import { validateSequence } from './event-contracts'
import { logAndContinue } from '@events/utils'

// ─────────────────────────────────────────────────────────────
// Validation Operators
// ─────────────────────────────────────────────────────────────

/**
 * RxJS operator: Validate event sequence against contract
 *
 * Accumulates events and validates them against the contract.
 * Emits validation errors when sequence doesn't match expected pattern.
 *
 * **Performance**: Per-event validation overhead <1ms
 *
 * @param contract - Event sequence contract to validate against
 * @returns RxJS operator that validates events
 *
 * @example
 * ```typescript
 * // Validate agent events follow workflow creation pattern
 * systemEvents.agent$.pipe(
 *   validateEventSequence(workflowCreationContract),
 *   catchError(err => {
 *     console.error('[Validation] Stream error:', err)
 *     return EMPTY
 *   })
 * ).subscribe()
 * ```
 */
export function validateEventSequence(
  contract: EventSequenceContract
): OperatorFunction<SystemEvent, SystemEvent>
{
  return (source: Observable<SystemEvent>) =>
  {
    // Accumulate events for sequence validation
    const events: SystemEvent[] = []

    return source.pipe(
      tap(event => events.push(event)),
      scan((_, event) =>
      {
        // Validate accumulated sequence
        const result = validateSequence(events, contract)

        // Log errors if validation failed (dev-only, don't emit events)
        if (!result.valid)
        {
          result.errors.forEach(error =>
          {
            console.error(
              `[Validation] ${contract.name}: ${error}`,
              {
                contract: contract.name,
                actualSequence: result.actualSequence,
                eventCount: events.length
              }
            )
          })
        }

        // Log warnings (timeouts, extra events) (dev-only, don't emit events)
        if (result.warnings.length > 0)
        {
          result.warnings.forEach(warning =>
          {
            console.warn(
              `[Validation] ${contract.name}: ${warning}`,
              {
                contract: contract.name,
                actualSequence: result.actualSequence
              }
            )
          })
        }

        return event
      }),
      logAndContinue('Validation')
    )
  }
}

/**
 * RxJS operator: Validate LangGraph node handoffs
 *
 * Ensures agent nodes always return to orchestrator, never directly to END.
 * This catches the Phase 1 Bug 1 regression (executor → END).
 *
 * **What it validates**:
 * - Agent nodes should handoff to orchestrator (not END)
 * - Agent nodes should not skip orchestrator to go to another agent
 *
 * @returns RxJS operator that validates graph handoffs
 *
 * @example
 * ```typescript
 * // Validate graph handoffs
 * systemEvents.graph$.pipe(
 *   validateGraphHandoffs()
 * ).subscribe()
 * ```
 */
export function validateGraphHandoffs(): OperatorFunction<GraphEvent, GraphEvent>
{
  return (source: Observable<GraphEvent>) =>
  {
    let lastFromStep: string | null = null

    return source.pipe(
      filter(e => e.type === 'handoff'),
      tap(event =>
      {
        if (event.type === 'handoff')
        {
          const { fromStep, toStep } = event.payload

          // Track last step we came from
          if (fromStep)
          {
            lastFromStep = fromStep
          }

          // Validate: Agent nodes should return to orchestrator
          const agentSteps = ['enrichment', 'planner', 'validator', 'executor']

          if (lastFromStep && agentSteps.includes(lastFromStep))
          {
            // Check if agent went to END (critical error)
            if (toStep === undefined)
            {
              console.error(
                `[Validation] CRITICAL: Agent '${lastFromStep}' → END (should be orchestrator)`,
                {
                  fromStep: lastFromStep,
                  toStep: 'END',
                  severity: 'critical'
                }
              )
            }
            // Check if agent skipped orchestrator (warning)
            else if (toStep !== 'orchestrator' && agentSteps.includes(toStep))
            {
              console.warn(
                `[Validation] Agent '${lastFromStep}' → '${toStep}' (skipped orchestrator)`,
                {
                  fromStep: lastFromStep,
                  toStep,
                  severity: 'warning'
                }
              )
            }
          }

          // Reset tracking after orchestrator
          if (fromStep === 'orchestrator')
          {
            lastFromStep = null
          }
        }
      }),
      logAndContinue('GraphHandoff')
    )
  }
}

/**
 * RxJS operator: Validate no duplicate agent executions
 *
 * Ensures an agent doesn't start twice without completing.
 * Catches bugs where agent state machine gets confused.
 *
 * @returns RxJS operator that validates no duplicate agent starts
 *
 * @example
 * ```typescript
 * // Validate no duplicate agent starts
 * systemEvents.agent$.pipe(
 *   validateNoDuplicateStarts()
 * ).subscribe()
 * ```
 */
export function validateNoDuplicateStarts(): OperatorFunction<AgentEvent, AgentEvent>
{
  return (source: Observable<AgentEvent>) =>
  {
    const activeAgents = new Set<string>()

    return source.pipe(
      tap(event =>
      {
        const { agent } = event.payload

        if (event.type === 'started')
        {
          // Check if agent already active
          if (activeAgents.has(agent))
          {
            console.error(
              `[Validation] Agent '${agent}' started twice without completing (state machine bug)`,
              {
                agent,
                activeAgents: Array.from(activeAgents)
              }
            )
          }

          activeAgents.add(agent)
        }
        else if (event.type === 'completed')
        {
          // Remove from active set
          activeAgents.delete(agent)
        }
      }),
      logAndContinue('DuplicateStarts')
    )
  }
}

/**
 * RxJS operator: Validate workflow creation performance
 *
 * Warns if workflow creation takes too long (>30 seconds).
 * Useful for detecting performance regressions.
 *
 * @param maxDuration - Maximum allowed duration in milliseconds (default: 30000)
 * @returns RxJS operator that validates performance
 *
 * @example
 * ```typescript
 * // Validate workflow creation completes within 30 seconds
 * systemEvents.workflow$.pipe(
 *   validateCreationPerformance(30000)
 * ).subscribe()
 * ```
 */
export function validateCreationPerformance(
  maxDuration = 30000
): OperatorFunction<SystemEvent, SystemEvent>
{
  return (source: Observable<SystemEvent>) =>
  {
    let startTime: number | null = null

    return source.pipe(
      tap(event =>
      {
        // Track start of workflow creation
        if (event.domain === 'agent' && event.type === 'started')
        {
          if ('agent' in event.payload && event.payload.agent === 'enrichment')
          {
            startTime = event.timestamp
          }
        }

        // Check duration on workflow created
        if (event.domain === 'workflow' && event.type === 'created')
        {
          if (startTime !== null)
          {
            const duration = event.timestamp - startTime

            if (duration > maxDuration)
            {
              console.warn(
                `[Validation] Workflow creation took ${duration}ms (max: ${maxDuration}ms)`,
                {
                  duration,
                  maxDuration,
                  severity: 'warning'
                }
              )
            }

            startTime = null
          }
        }
      }),
      logAndContinue('CreationPerformance')
    )
  }
}
