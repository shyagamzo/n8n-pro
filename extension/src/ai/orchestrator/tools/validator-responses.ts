import validatorPromptMd from '@ai/prompts/agents/validator-prompt.md?raw'

/**
 * Validation Prompt Builder
 *
 * Builds the prompt for the validator agent by injecting:
 * - The workflow to validate
 * - The list of available node types
 */

/**
 * Build validation prompt from markdown template
 *
 * @param loomWorkflow - Workflow in Loom format to validate
 * @param availableNodeTypes - List of valid node type names
 * @returns Complete validation prompt
 */
export function buildValidationPrompt(
  loomWorkflow: string,
  availableNodeTypes: string[]
): string
{
  // Format node types as a bulleted list
  const nodeTypesList = availableNodeTypes.map(type => `- ${type}`).join('\n')

  return validatorPromptMd
    .replace('{LOOM_WORKFLOW}', loomWorkflow)
    .replace('{AVAILABLE_NODE_TYPES}', nodeTypesList)
}
