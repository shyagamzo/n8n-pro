import validatorPromptMd from '../../prompts/agents/validator-prompt.md?raw'
import validResponseMd from '../../prompts/agents/validator-responses/valid.md?raw'
import invalidWithCorrectionMd from '../../prompts/agents/validator-responses/invalid-with-correction.md?raw'
import invalidNoCorrectionMd from '../../prompts/agents/validator-responses/invalid-no-correction.md?raw'
import unexpectedMd from '../../prompts/agents/validator-responses/unexpected.md?raw'

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
 * Injects the Loom workflow into the template.
 */
export function buildValidationPrompt(loomWorkflow: string): string {
  return validatorPromptMd.replace('{LOOM_WORKFLOW}', loomWorkflow)
}

// ============================================================================
// Response Formatters
// ============================================================================

export function formatValidResponse(): string {
  return validResponseMd
}

export function formatInvalidResponse(errors: string, correctedLoom: string | null): string {
  if (!correctedLoom) {
    return invalidNoCorrectionMd.replace('{ERRORS}', errors)
  }

  return invalidWithCorrectionMd
    .replace('{ERRORS}', errors)
    .replace('{CORRECTED_LOOM}', correctedLoom)
}

export function formatUnexpectedResponse(content: string): string {
  return unexpectedMd.replace('{CONTENT}', content)
}

