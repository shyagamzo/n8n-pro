/**
 * Prompt Library - Organized system prompts for AI agents
 *
 * This module loads markdown prompts and provides type-safe access.
 * Prompts are stored as markdown files for easy editing and version control.
 */

// Import agent prompts using Vite's ?raw suffix
import classifierPrompt from './agents/classifier.md?raw'
import enrichmentPrompt from './agents/enrichment.md?raw'
import plannerPrompt from './agents/planner.md?raw'
import executorPrompt from './agents/executor.md?raw'

// Import shared knowledge base
import n8nNodesReference from './shared/n8n-nodes-reference.md?raw'
import workflowPatterns from './shared/workflow-patterns.md?raw'
import constraints from './shared/constraints.md?raw'

/**
 * Agent types supported by the system
 */
export type AgentType = 'classifier' | 'enrichment' | 'planner' | 'executor'

/**
 * Prompt composition options for dynamic content injection
 */
export type PromptOptions = {
  /**
   * Include n8n nodes reference documentation
   */
  includeNodesReference?: boolean

  /**
   * Include common workflow patterns
   */
  includeWorkflowPatterns?: boolean

  /**
   * Include system constraints
   */
  includeConstraints?: boolean

  /**
   * Additional context to inject (e.g., available credentials, existing workflows)
   */
  context?: Record<string, unknown>
}

/**
 * Base prompts for each agent type
 */
const agentPrompts: Record<AgentType, string> = {
  classifier: classifierPrompt,
  enrichment: enrichmentPrompt,
  planner: plannerPrompt,
  executor: executorPrompt,
}

/**
 * Shared knowledge base sections
 */
export const sharedKnowledge = {
  n8nNodes: n8nNodesReference,
  patterns: workflowPatterns,
  constraints,
} as const

/**
 * Get the base system prompt for an agent
 *
 * @param agent - Agent type
 * @returns Raw markdown prompt
 */
export function getAgentPrompt(agent: AgentType): string
{
  return agentPrompts[agent]
}

/**
 * Build a complete system prompt with optional additions
 *
 * @param agent - Agent type
 * @param options - Prompt composition options
 * @returns Composed system prompt
 *
 * @example
 * ```ts
 * const prompt = buildPrompt('planner', {
 *   includeNodesReference: true,
 *   includeWorkflowPatterns: true,
 *   context: {
 *     availableCredentials: ['slackApi', 'gmailOAuth2']
 *   }
 * })
 * ```
 */
export function buildPrompt(agent: AgentType, options: PromptOptions = {}): string
{
  const sections: string[] = []

  // Start with base agent prompt
  sections.push(agentPrompts[agent])

  // Add shared knowledge sections if requested
  if (options.includeNodesReference)
  {
    sections.push('\n---\n\n# Available n8n Nodes\n\n' + sharedKnowledge.n8nNodes)
  }

  if (options.includeWorkflowPatterns)
  {
    sections.push('\n---\n\n# Workflow Patterns\n\n' + sharedKnowledge.patterns)
  }

  if (options.includeConstraints)
  {
    sections.push('\n---\n\n# System Constraints\n\n' + sharedKnowledge.constraints)
  }

  // Inject dynamic context if provided
  if (options.context)
  {
    const contextSection = formatContext(options.context)

    if (contextSection)
    {
      sections.push('\n---\n\n# Current Context\n\n' + contextSection)
    }
  }

  return sections.join('\n')
}

/**
 * Format context object into readable text for injection
 *
 * @param context - Context data to format
 * @returns Formatted context string
 */
function formatContext(context: Record<string, unknown>): string
{
  const lines: string[] = []

  for (const [key, value] of Object.entries(context))
  {
    if (value === undefined || value === null) continue

    // Convert key from camelCase to Title Case
    const title = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()

    lines.push(`## ${title}`)

    if (Array.isArray(value))
    {
      if (value.length === 0)
      {
        lines.push('None available')
      }
      else
      {
        value.forEach((item) =>
        {
          if (typeof item === 'object')
          {
            lines.push(`- ${JSON.stringify(item)}`)
          }
          else
          {
            lines.push(`- ${item}`)
          }
        })
      }
    }
    else if (typeof value === 'object')
    {
      lines.push('```json')
      lines.push(JSON.stringify(value, null, 2))
      lines.push('```')
    }
    else
    {
      lines.push(String(value))
    }

    lines.push('') // Empty line between sections
  }

  return lines.join('\n')
}

/**
 * Validate that all required prompts are loaded
 * Useful for testing and debugging
 *
 * @returns Object with validation results
 */
export function validatePrompts(): { valid: boolean; missing: string[] }
{
  const missing: string[] = []

  for (const [agent, prompt] of Object.entries(agentPrompts))
  {
    if (!prompt || prompt.trim().length === 0)
    {
      missing.push(`Agent prompt: ${agent}`)
    }
  }

  if (!sharedKnowledge.n8nNodes) missing.push('Shared knowledge: n8n-nodes-reference')
  if (!sharedKnowledge.patterns) missing.push('Shared knowledge: workflow-patterns')
  if (!sharedKnowledge.constraints) missing.push('Shared knowledge: constraints')

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Export all prompts for direct access if needed
 */
export const prompts = {
  agents: agentPrompts,
  shared: sharedKnowledge,
} as const

