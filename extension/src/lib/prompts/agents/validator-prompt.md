# Validator Prompt

Validate this n8n workflow plan for correctness.

## Workflow Plan (Loom format)

{LOOM_WORKFLOW}

## Validation Checklist

Check for:

1. **Node types** are valid n8n node types (correct package.nodeName format, e.g. "n8n-nodes-base.slack")
2. **Required parameters** are present for each node type
3. **Connections** reference existing node names
4. **Trigger nodes** are appropriate (scheduleTrigger, webhook, manualTrigger, etc.)
5. **Credentials** are correctly specified where needed

## Response Format

- If the workflow is VALID, respond with: `[VALID]`
- If there are ERRORS, respond with: `[INVALID]`
  Then list each error clearly, and provide a CORRECTED version of the workflow in Loom format.

