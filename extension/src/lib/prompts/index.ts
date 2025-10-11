/**
 * Prompt Library - Public API
 * 
 * System prompts for AI agents with markdown-based storage.
 * See ./prompt-loader.ts for implementation.
 */

export {
  getAgentPrompt,
  buildPrompt,
  validatePrompts,
  sharedKnowledge,
  prompts
} from './prompt-loader'

export type { AgentType, PromptOptions } from './prompt-loader'

