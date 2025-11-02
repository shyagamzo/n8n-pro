/**
 * Workflow State Subscriber
 *
 * Derives workflow state machine transitions from agent and workflow events.
 * Maintains current state and emits state_transition events.
 *
 * **Context**: Background worker only
 * **Pattern**: Stateful subscriber that validates transitions
 *
 * State transitions are bridged to content script via messaging subscriber.
 */

import { Subject, type Subscription } from 'rxjs'
import { filter, takeUntil, finalize } from 'rxjs/operators'

import { systemEvents } from '@events/index'
import { emitSystemInfo, emitSubscriberError } from '@events/emitters'
import type { AgentEvent, WorkflowEvent, StateTransitionEvent } from '@events/types'
import type { WorkflowStateData } from '@shared/types/workflow-state'
import {
  createInitialState,
  startEnrichment,
  startPlanning,
  awaitApproval,
  startExecution,
  completeWorkflow,
  failWorkflow,
  resetWorkflow
} from '@shared/types/workflow-state'

// ─────────────────────────────────────────────────────────────
// State Management
// ─────────────────────────────────────────────────────────────

const destroy$ = new Subject<void>()

/**
 * Current workflow state (maintained per session)
 *
 * In production, this should be session-scoped.
 * For MVP, single global state suffices.
 */
let currentState: WorkflowStateData = createInitialState()

// ─────────────────────────────────────────────────────────────
// Event Emission
// ─────────────────────────────────────────────────────────────

/**
 * Emit state transition event
 *
 * Emits to local event bus. Messaging subscriber will bridge to content script.
 *
 * @param previous - Previous state data
 * @param next - New state data
 * @param trigger - Event that triggered this transition
 * @param sessionId - Optional session ID
 */
function emitStateTransition(
  previous: WorkflowStateData,
  next: WorkflowStateData,
  trigger: string,
  sessionId?: string
): void
{
  const event: StateTransitionEvent = {
    domain: 'state',
    type: 'transition',
    payload: {
      previous: previous.state,
      current: next.state,
      trigger,
      stateData: next,
      sessionId
    },
    timestamp: Date.now()
  }

  systemEvents.emit(event)

  emitSystemInfo('workflow-state', `State transition: ${previous.state} → ${next.state}`, {
    trigger,
    sessionId
  })
}

// ─────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────

/**
 * Handle agent events and derive state transitions
 *
 * Transitions:
 * - enrichment:started (idle) → enrichment
 * - enrichment:completed (enrichment) → planning
 * - executor:started (awaiting_approval) → executing
 *
 * @param event - Agent event from event bus
 */
function handleAgentEvent(event: AgentEvent): void
{
  try
  {
    const previous = currentState
    let next: WorkflowStateData | null = null

    // Derive state transitions from agent lifecycle
    switch (event.payload.agent)
    {
      case 'enrichment':
        if (event.type === 'started' && previous.state === 'idle')
        {
          next = startEnrichment(previous)
        }
        else if (event.type === 'completed' && previous.state === 'enrichment')
        {
          // Enrichment complete → start planning
          next = startPlanning(previous)
        }

        break

      case 'planner':
        // Planning starts automatically (already transitioned from enrichment:completed)
        // Plan generated is handled via workflow:validated event
        break

      case 'executor':
        if (event.type === 'started' && previous.state === 'awaiting_approval')
        {
          next = startExecution(previous)
        }

        break

      default:
        // Orchestrator/validator don't trigger state changes
        break
    }

    if (next)
    {
      currentState = next
      emitStateTransition(previous, next, `agent:${event.type}`, event.payload.sessionId)
    }
  }
  catch (error)
  {
    emitSubscriberError(error, 'workflow-state-agent')
  }
}

/**
 * Handle workflow events and derive state transitions
 *
 * Transitions:
 * - workflow:created (executing) → completed
 * - workflow:failed (any) → failed
 *
 * @param event - Workflow event from event bus
 */
function handleWorkflowEvent(event: WorkflowEvent): void
{
  try
  {
    const previous = currentState
    let next: WorkflowStateData | null = null

    if (event.type === 'created' && previous.state === 'executing')
    {
      next = completeWorkflow(previous, event.payload.workflowId!)
    }
    else if (event.type === 'failed')
    {
      next = failWorkflow(previous, {
        message: event.payload.error?.message || 'Workflow creation failed',
        retryable: true
      })
    }

    if (next)
    {
      currentState = next
      emitStateTransition(previous, next, `workflow:${event.type}`)
    }
  }
  catch (error)
  {
    emitSubscriberError(error, 'workflow-state-workflow')
  }
}

/**
 * Handle plan events (workflow:validated with plan metadata)
 *
 * Transitions:
 * - workflow:validated with plan (planning) → awaiting_approval
 *
 * @param event - Workflow validated event with plan metadata
 */
function handlePlanEvent(event: WorkflowEvent): void
{
  try
  {
    const previous = currentState

    if (previous.state === 'planning' && event.payload.metadata?.plan)
    {
      const next = awaitApproval(previous, event.payload.metadata.plan)
      currentState = next
      emitStateTransition(previous, next, 'plan:generated', event.payload.metadata.sessionId)
    }
  }
  catch (error)
  {
    emitSubscriberError(error, 'workflow-state-plan')
  }
}

// ─────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────

/**
 * Start workflow state tracking
 *
 * Subscribes to agent and workflow events to derive state transitions.
 */
export function setup(): void
{
  const subscriptions: Subscription[] = []

  // Subscribe to agent events
  const agentSub = systemEvents.agent$
    .pipe(
      filter(e => e.type === 'started' || e.type === 'completed'),
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('workflow-state', 'Agent tracking cleaned up', {}))
    )
    .subscribe(handleAgentEvent)
  subscriptions.push(agentSub)

  // Subscribe to workflow events
  const workflowSub = systemEvents.workflow$
    .pipe(
      filter(e => e.type === 'created' || e.type === 'failed'),
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('workflow-state', 'Workflow tracking cleaned up', {}))
    )
    .subscribe(handleWorkflowEvent)
  subscriptions.push(workflowSub)

  // Subscribe to plan events (workflow:validated with plan metadata)
  const planSub = systemEvents.workflow$
    .pipe(
      filter(e => e.type === 'validated' && e.payload.metadata?.plan !== undefined),
      takeUntil(destroy$),
      finalize(() => emitSystemInfo('workflow-state', 'Plan tracking cleaned up', {}))
    )
    .subscribe(handlePlanEvent)
  subscriptions.push(planSub)

  emitSystemInfo('workflow-state', 'Workflow state machine initialized', {
    initialState: currentState.state
  })
}

/**
 * Stop workflow state tracking
 *
 * Cleans up subscriptions and resets state.
 */
export function cleanup(): void
{
  destroy$.next()
  destroy$.complete()
  currentState = createInitialState() // Reset state on cleanup
}

/**
 * Get current workflow state (for testing/debugging)
 *
 * @returns Current workflow state data
 * @internal
 */
export function getCurrentState(): WorkflowStateData
{
  return currentState
}

/**
 * Reset workflow state (for new conversations)
 *
 * Should be called when user clears chat or starts new conversation.
 */
export function reset(): void
{
  const previous = currentState
  currentState = resetWorkflow(previous)
  emitStateTransition(previous, currentState, 'reset')
}
