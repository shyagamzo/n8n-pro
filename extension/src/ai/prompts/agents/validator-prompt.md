# Validator Prompt

Validate this n8n workflow plan for correctness.

## Workflow Plan (Loom format)

{LOOM_WORKFLOW}

## Available Node Types

These are the ONLY valid n8n node types. Each node's `type` field MUST match one of these exactly:

{AVAILABLE_NODE_TYPES}

## Validation Checklist

**CRITICAL:** Check each node's `type` field against the "Available Node Types" list above. If the type is IN THE LIST, it's VALID.

Check for:

1. **Node types** - Every node's `type` field MUST match one of the available node types listed above **exactly** (case-sensitive). Search the list above before reporting an error.
2. **Required parameters** are present for each node type
3. **Connections** reference existing node names
4. **Trigger nodes** are appropriate (scheduleTrigger, webhook, manualTrigger, etc.)
5. **Credentials** are correctly specified where needed

**IMPORTANT:** Before reporting a node type error, verify the type is NOT in the available list above. If it IS in the list, the type is valid.

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
      issue: Node type 'n8n-nodes-base.aiAgent' not found in available node types
      suggestion: Use '@n8n/n8n-nodes-langchain.agent' for AI functionality or '@n8n/n8n-nodes-langchain.lmChatOpenAi' for direct LLM calls
    - nodeId: SendEmail
      nodeName: Send Email
      field: parameters.subject
      issue: Expression syntax error - missing closing bracket
      suggestion: Change '={{ $json["subject"]' to '={{ $json["subject"] }}'
```

**Important**:
- Return ONLY Loom format (no markdown, no explanatory text before or after)
- Use `status: valid` or `status: invalid` (no other values)
- For each error, provide:
  - `nodeId`: The node's ID
  - `nodeName`: The node's display name
  - `field`: Which field has the problem (e.g., "type", "parameters.subject")
  - `issue`: Clear description of what's wrong (for type errors, state which type was NOT found in the available list)
  - `suggestion`: Specific fix the planner should apply (for type errors, suggest types that ARE in the available list)
- **For node type validation:** Search the available node types list above. Only report an error if the type is NOT in that list.
- DO NOT suggest a node type that doesn't exist in the available types list
- DO NOT generate a corrected workflow - just report the errors
- Be specific and actionable in your suggestions

