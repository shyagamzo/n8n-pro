/**
 * Response templates for the validator tool.
 * 
 * These templates format validation results in natural language
 * that's easy for LLMs to understand and act upon.
 */

// ============================================================================
// Response Templates
// ============================================================================

export const VALIDATION_PROMPT_TEMPLATE = (loomWorkflow: string) => `Validate this n8n workflow plan for correctness.

Workflow Plan (Loom format):
${loomWorkflow}

Check for:
1. Node types are valid n8n node types (correct package.nodeName format, e.g. "n8n-nodes-base.slack")
2. Required parameters are present for each node type
3. Connections reference existing node names
4. Trigger nodes are appropriate (scheduleTrigger, webhook, manualTrigger, etc.)
5. Credentials are correctly specified where needed

Response format:
- If the workflow is VALID, respond with: [VALID]
- If there are ERRORS, respond with: [INVALID]
  Then list each error clearly, and provide a CORRECTED version of the workflow in Loom format.`

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

