/**
 * LangChain message utility functions
 *
 * Helpers for working with LangChain BaseMessage types,
 * extracting tool calls, and processing message history.
 */

// ==========================================
// Imports
// ==========================================

import { isAIMessage, isToolMessage } from '@langchain/core/messages'
import type { BaseMessage } from '@langchain/core/messages'

// ==========================================
// Tool Call Extraction
// ==========================================

/**
 * Find the most recent tool call with a specific name
 *
 * Searches backwards through messages for an AIMessage with the specified tool call.
 * Uses LangChain's isAIMessage type guard for proper typing.
 *
 * @param messages - Array of LangChain messages
 * @param toolName - Name of the tool to find
 * @returns Tool call args or undefined if not found
 *
 * @example
 * ```typescript
 * const status = findLastToolCall<{ hasAllRequiredInfo: boolean }>(
 *   messages,
 *   'reportRequirementsStatus'
 * )
 * ```
 */
export function findLastToolCall<T = unknown>(
  messages: BaseMessage[],
  toolName: string
): T | undefined
{
  // Search backwards for efficiency (most recent first)
  for (let i = messages.length - 1; i >= 0; i--)
  {
    const msg = messages[i]

    if (isAIMessage(msg) && msg.tool_calls)
    {
      const toolCall = msg.tool_calls.find(tc => tc.name === toolName)

      if (toolCall)
      {
        return toolCall.args as T
      }
    }
  }

  return undefined
}

/**
 * Find the most recent tool message (tool result) by tool name
 *
 * Searches backwards through messages for a ToolMessage matching the tool name.
 * Uses LangChain's isToolMessage type guard for proper typing.
 *
 * @param messages - Array of LangChain messages
 * @param toolName - Name of the tool to find results for
 * @returns Parsed tool result or undefined if not found
 *
 * @example
 * ```typescript
 * const workflow = findLastToolResult<{ id: string; name: string }>(
 *   messages,
 *   'create_n8n_workflow'
 * )
 * ```
 */
export function findLastToolResult<T = unknown>(
  messages: BaseMessage[],
  toolName: string
): T | undefined
{
  // Search backwards for efficiency
  for (let i = messages.length - 1; i >= 0; i--)
  {
    const msg = messages[i]

    if (isToolMessage(msg) && msg.name === toolName)
    {
      try
      {
        // Tool messages return JSON strings
        return JSON.parse(msg.content as string) as T
      }
      catch
      {
        return undefined
      }
    }
  }

  return undefined
}


