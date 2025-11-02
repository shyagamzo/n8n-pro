/**
 * Agent Output Metadata System
 *
 * Centralized registry declaring how each agent's output should be handled by the chat UI.
 * Eliminates special-case logic scattered throughout chat.ts.
 *
 * **Context**: Runs in content script context (UI side)
 *
 * **Pattern**: Declarative metadata as single source of truth for agent behavior
 *
 * @example
 * ```typescript
 * import { shouldShowTokens, getAgentMetadata } from '@ai/orchestrator/agent-metadata'
 *
 * // Instead of hardcoded checks:
 * if (agent === 'planner' || agent === 'validator') return
 *
 * // Use metadata:
 * if (!shouldShowTokens(agent)) return
 * ```
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Format of agent output determines how tokens are processed and displayed
 */
export type AgentOutputFormat =
  | 'none'       // No output (executor)
  | 'text'       // Markdown text (enrichment)
  | 'loom'       // Loom protocol (planner, validator)
  | 'structured' // Structured data (future: optimizer)

/**
 * Metadata describing an agent's output characteristics
 *
 * This metadata is consulted by the chat service to determine:
 * - Whether to create message bubbles
 * - Whether to show streaming tokens
 * - Whether to persist to history
 * - What labels/status messages to display
 */
export type AgentOutputMetadata = {
  /**
   * Whether agent output should be visible to users
   *
   * `false` = No message bubble created (executor)
   * `true` = Create message bubble (enrichment, planner, validator)
   */
  visibleToUser: boolean

  /**
   * Format of agent output
   *
   * Determines how tokens are processed and displayed
   */
  format: AgentOutputFormat

  /**
   * Whether to show streaming tokens in real-time
   *
   * `false` = Hide tokens until complete (planner, validator)
   * `true` = Show tokens as they arrive (enrichment)
   */
  streamTokens: boolean

  /**
   * Whether agent output should be saved to message history
   *
   * `false` = Ephemeral UI feedback only (executor)
   * `true` = Persist to storage (enrichment, planner, validator)
   */
  persistToHistory: boolean

  /**
   * User-friendly agent name shown in UI
   *
   * Used for accessibility announcements and agent labels
   */
  displayName: string

  /**
   * Status message shown while agent is working
   *
   * Used for ThinkingAnimation and screen reader announcements
   */
  workingMessage: string
}

/**
 * Complete registry of all agent metadata
 *
 * Type-safe registry ensures all agents have metadata defined
 */
export type AgentMetadataRegistry = {
  enrichment: AgentOutputMetadata
  planner: AgentOutputMetadata
  validator: AgentOutputMetadata
  executor: AgentOutputMetadata
  orchestrator: AgentOutputMetadata
}

// ─────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────

/**
 * Centralized agent metadata registry
 *
 * Single source of truth for agent output behavior.
 * Modifications to agent behavior should be made here, not in chat.ts.
 */
export const agentMetadata: AgentMetadataRegistry = {
  enrichment: {
    visibleToUser: true,
    format: 'text',
    streamTokens: true,
    persistToHistory: true,
    displayName: 'Assistant',
    workingMessage: 'Understanding your requirements...'
  },

  planner: {
    visibleToUser: false, // Plan shown in PlanMessage UI, not raw Loom
    format: 'loom',
    streamTokens: false, // Loom is internal, hide until parsed
    persistToHistory: true, // Persist parsed plan
    displayName: 'Workflow Planner',
    workingMessage: 'Creating workflow plan...'
  },

  validator: {
    visibleToUser: false, // Validation is internal process
    format: 'loom',
    streamTokens: false,
    persistToHistory: false, // Don't clutter history with validation
    displayName: 'Validator',
    workingMessage: 'Validating workflow structure...'
  },

  executor: {
    visibleToUser: false, // Success shown via toast, not message
    format: 'none',
    streamTokens: false,
    persistToHistory: false,
    displayName: 'Builder',
    workingMessage: 'Creating workflow in n8n...'
  },

  orchestrator: {
    visibleToUser: false, // Pure routing, no output
    format: 'none',
    streamTokens: false,
    persistToHistory: false,
    displayName: 'Orchestrator',
    workingMessage: 'Coordinating agents...'
  }
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get metadata for an agent
 *
 * Returns default metadata if agent not found (defensive programming).
 * Logs warning in development to catch missing metadata early.
 *
 * @param agent - Agent name (enrichment, planner, validator, executor, orchestrator)
 * @returns Agent metadata with all output characteristics
 *
 * @example
 * ```typescript
 * const meta = getAgentMetadata('enrichment')
 * console.log(meta.displayName) // "Assistant"
 * console.log(meta.streamTokens) // true
 * ```
 */
export function getAgentMetadata(agent: string): AgentOutputMetadata
{
  const metadata = agentMetadata[agent as keyof AgentMetadataRegistry]

  if (!metadata)
  {
    console.warn(`[AgentMetadata] Unknown agent: ${agent}, using defaults`)

    return {
      visibleToUser: true,
      format: 'text',
      streamTokens: true,
      persistToHistory: true,
      displayName: 'Assistant',
      workingMessage: 'Processing...'
    }
  }

  return metadata
}

/**
 * Should create message bubble for agent?
 *
 * Replaces hardcoded checks like `if (agent === 'executor') { skip message }`
 *
 * @param agent - Agent name
 * @returns `true` if agent output should create message bubble
 *
 * @example
 * ```typescript
 * // Before:
 * if (message.agent === 'executor') {
 *   this.streamingMessageId = null
 *   return
 * }
 *
 * // After:
 * if (!shouldCreateMessage(message.agent)) {
 *   this.streamingMessageId = null
 *   return
 * }
 * ```
 */
export function shouldCreateMessage(agent: string): boolean
{
  return getAgentMetadata(agent).visibleToUser
}

/**
 * Should show streaming tokens for agent?
 *
 * Replaces hardcoded checks like `if (agent === 'planner' || agent === 'validator') { skip tokens }`
 *
 * @param agent - Agent name
 * @returns `true` if tokens should be displayed in real-time
 *
 * @example
 * ```typescript
 * // Before:
 * if (this.currentAgent === 'planner' || this.currentAgent === 'validator') return
 *
 * // After:
 * if (!shouldShowTokens(this.currentAgent)) return
 * ```
 */
export function shouldShowTokens(agent: string): boolean
{
  const meta = getAgentMetadata(agent)
  return meta.visibleToUser && meta.streamTokens
}

/**
 * Should persist agent output to history?
 *
 * Determines whether agent output should be saved to chrome.storage.local
 *
 * @param agent - Agent name
 * @returns `true` if output should be persisted
 *
 * @example
 * ```typescript
 * if (shouldPersist(agent)) {
 *   await saveToStorage(message)
 * }
 * ```
 */
export function shouldPersist(agent: string): boolean
{
  return getAgentMetadata(agent).persistToHistory
}
