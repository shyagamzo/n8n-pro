# Validator Prompt

Validate this n8n workflow plan for correctness.

## Workflow Plan (Loom format)

{LOOM_WORKFLOW}

## Available Node Types

These are the ONLY valid n8n node types. Each node's `type` field MUST match one of these exactly:

{AVAILABLE_NODE_TYPES}

## Validation Checklist

Check for:

1. **Node types** - Every node's `type` field MUST match one of the available node types listed above exactly (case-sensitive)
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
    - nodeId: GenerateJoke
      nodeName: Generate Joke
      field: type
      issue: Node type '@n8n/n8n-nodes-langchain.lmChatOpenAi' doesn't exist
      suggestion: Use '@n8n/n8n-nodes-langchain.lmChatOpenAi' (note the capital 'O' in OpenAi) or '@n8n/n8n-nodes-langchain.agent' for AI functionality
    - nodeId: SendEmail
      nodeName: Send Email
      field: parameters.subject
      issue: Expression syntax error - missing closing bracket
      suggestion: Change '={{ $json["subject"]' to '={{ $json["subject"] }}'
```

**Important**:
- Use `status: valid` or `status: invalid` (no other values)
- For each error, provide:
  - `nodeId`: The node's ID
  - `nodeName`: The node's display name
  - `field`: Which field has the problem (e.g., "type", "parameters.subject")
  - `issue`: Clear description of what's wrong
  - `suggestion`: Specific fix the planner should apply
- DO NOT generate a corrected workflow - just report the errors
- Be specific and actionable in your suggestions

