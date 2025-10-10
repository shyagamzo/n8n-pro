import { ChatOrchestrator } from '../lib/orchestrator'

/**
 * Session-based orchestrator manager.
 *
 * Maintains a mapping of port/tab IDs to ChatOrchestrator instances,
 * enabling session persistence across messages and workflow creation.
 *
 * Each chat panel gets its own orchestrator instance with a unique thread_id,
 * allowing LangGraph's checkpointer to maintain conversation state.
 */

type SessionId = string

const orchestrators = new Map<SessionId, ChatOrchestrator>()

/**
 * Get or create an orchestrator for a session.
 */
export function getOrchestrator(sessionId: SessionId): ChatOrchestrator
{
  let orchestrator = orchestrators.get(sessionId)

  if (!orchestrator)
  {
    orchestrator = new ChatOrchestrator(sessionId)
    orchestrators.set(sessionId, orchestrator)
    console.log('🎯 Created new orchestrator for session:', sessionId)
  }

  return orchestrator
}

/**
 * Clean up orchestrator for a disconnected session.
 */
export function cleanupOrchestrator(sessionId: SessionId): void
{
  if (orchestrators.delete(sessionId))
  {
    console.log('🧹 Cleaned up orchestrator for session:', sessionId)
  }
}

/**
 * Get all active session IDs.
 */
export function getActiveSessions(): SessionId[]
{
  return Array.from(orchestrators.keys())
}

/**
 * Get total number of active sessions.
 */
export function getActiveSessionCount(): number
{
  return orchestrators.size
}

