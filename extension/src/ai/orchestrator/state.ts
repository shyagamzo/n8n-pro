import type { BaseMessage } from '@langchain/core/messages'
import { Annotation } from '@langchain/langgraph'
import type { Plan } from '@shared/types/plan'

/**
 * Unified state schema for the LangGraph orchestrator.
 * Handles both chat mode (enrichment) and workflow mode (planning/execution).
 */
export const OrchestratorState = Annotation.Root({
  /**
   * Message history using LangChain BaseMessage types.
   * Messages are appended via concat reducer.
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y)
  }),

  /**
   * Unique session identifier for this conversation/workflow.
   */
  sessionId: Annotation<string>(),

  /**
   * Mode determines the entry point into the graph:
   * - 'chat': Start with enrichment node for conversational interaction
   * - 'workflow': Start with planner node for workflow creation
   */
  mode: Annotation<'chat' | 'workflow'>(),

  /**
   * Generated workflow plan (Loom format converted to Plan type).
   * Set by planner node, used by validator and executor.
   */
  plan: Annotation<Plan | undefined>(),

  /**
   * ID of the created workflow in n8n.
   * Set by executor node after successful creation.
   */
  workflowId: Annotation<string | undefined>(),

  /**
   * Non-blocking credential guidance information.
   * Provides setup links without interrupting workflow creation.
   */
  credentialGuidance: Annotation<{
    missing: Array<{ name: string; type: string }>;
    setupLinks: Array<{ name: string; url: string }>;
  } | undefined>(),

  /**
   * Requirements gathering status from enrichment agent.
   * Used by orchestrator to determine when to transition to planning.
   */
  requirementsStatus: Annotation<{
    hasAllRequiredInfo: boolean;
    confidence: number;
    missingInfo?: string[];
  } | undefined>(),

  /**
   * Validation status from validator agent.
   * Simple valid/invalid flag with optional error details.
   */
  validationStatus: Annotation<{
    valid: boolean;
    errors?: string[];
  } | undefined>(),

  /**
   * Current step in the workflow creation process.
   * Used by orchestrator for explicit state machine routing.
   */
  currentStep: Annotation<'enrichment' | 'planner' | 'validator' | 'executor' | undefined>(),

  /**
   * History of steps taken in this session.
   * Useful for debugging and understanding the flow.
   */
  stepHistory: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),

})

/**
 * TypeScript type for the orchestrator state.
 * Use this for type-safe state access in nodes.
 */
export type OrchestratorStateType = typeof OrchestratorState.State

