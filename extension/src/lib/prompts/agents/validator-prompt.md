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

## Output Format (Loom)

Respond in Loom format with your validation result.

**If the workflow is VALID:**
```
validation:
  status: valid
```

**If the workflow is INVALID:**
```
validation:
  status: invalid
  errors:
    - error: Specific error description here
    - error: Another error description here
  correctedWorkflow:
    workflow:
      name: Corrected Workflow Name
      nodes:
        - id: node1
          type: n8n-nodes-base.nodetype
          parameters:
            param1: value1
      connections:
        node1:
          main:
            - node: node2
              type: main
              index: 0
```

**Important**: 
- Use `status: valid` or `status: invalid` (no other values)
- List each error as a separate array item under `errors:`
- Put the corrected workflow as a nested object under `correctedWorkflow:` (no pipe character)
- Ensure corrected workflow is in proper Loom format with correct indentation

