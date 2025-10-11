import { Annotation } from '@langchain/langgraph'
import type { BaseMessage } from '@langchain/core/messages'
import type { Plan } from '../types/plan'

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

})

/**
 * TypeScript type for the orchestrator state.
 * Use this for type-safe state access in nodes.
 */
export type OrchestratorStateType = typeof OrchestratorState.State

