import validatorPromptMd from '@ai/prompts/agents/validator-prompt.md?raw'
import validResponseMd from '@ai/prompts/agents/validator-responses/valid.md?raw'
import invalidNoCorrectionMd from '@ai/prompts/agents/validator-responses/invalid-no-correction.md?raw'
import unexpectedMd from '@ai/prompts/agents/validator-responses/unexpected.md?raw'

/**
 * Response templates for the validator tool.
 *
 * All templates are loaded from markdown files for easy editing.
 * Template variables are replaced at runtime with actual content.
 */

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Build validation prompt from markdown template.
 * Injects the Loom workflow and available node types into the template.
 */
export function buildValidationPrompt(
  loomWorkflow: string,
  availableNodeTypes: string[]
): string {
  // Format node types as a bulleted list
  const nodeTypesList = availableNodeTypes.map(type => `- ${type}`).join('\n')

  return validatorPromptMd
    .replace('{LOOM_WORKFLOW}', loomWorkflow)
    .replace('{AVAILABLE_NODE_TYPES}', nodeTypesList)
}

// ============================================================================
// Response Formatters
// ============================================================================

export function formatValidResponse(): string {
  return validResponseMd
}

export function formatInvalidResponse(errors: string): string {
  return invalidNoCorrectionMd.replace('{ERRORS}', errors)
}

export function formatUnexpectedResponse(content: string): string {
  return unexpectedMd.replace('{CONTENT}', content)
}

