import validatorPromptMd from '../../prompts/agents/validator-prompt.md?raw'

/**
 * Response templates for the validator tool.
 * 
 * These templates format validation results in natural language
 * that's easy for LLMs to understand and act upon.
 */

// ============================================================================
// Prompt Template
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
  return `✅ VALIDATION PASSED

The workflow is valid and n8n-compatible. You can proceed with the final output.`
}

export function formatInvalidResponse(errors: string, correctedLoom: string | null): string {
  if (!correctedLoom) {
    return `❌ VALIDATION FAILED

${errors}

Note: Could not automatically extract a corrected workflow. Please review the errors above and fix them manually.`
  }

  return `❌ VALIDATION FAILED

Errors Found:
${errors}

---

CORRECTED WORKFLOW (use this):
${correctedLoom}

---

Next Step: Review the corrected workflow above and use it for your final output.`
}

export function formatUnexpectedResponse(content: string): string {
  return `⚠️ VALIDATION ERROR

Unexpected validation response (no [VALID] or [INVALID] marker found).

Response:
${content}

Please review and try validating again.`
}

