# Loom Best Practices

Guidelines for using Loom effectively with LLMs and in production code.

## For LLMs

### When to Use Loom
- **Structured output**: Intent classification, plans, extracted entities
- **Multi-level nesting**: Workflow definitions, configuration objects
- **Token efficiency**: When working with token-limited contexts

### When NOT to Use Loom
- **Conversational responses**: Use plain text for natural dialogue
- **Simple strings**: Don't use Loom for single values
- **Binary data**: Loom is text-based only

### LLM Prompt Examples

```markdown
## Output Format

Respond using Loom format (indentation-based, no JSON):

intent: WORKFLOW_CREATE
confidence: 0.95
extractedEntities:
  trigger: schedule
  services: slack

Rules:
- Use 2-space indentation for nesting
- No quotes around values
- Arrays: inline for simple lists, multi-line with `-` for objects
- Types auto-detected: true/false/null/numbers
```

### Include Format Examples
Always include examples in system prompts to guide the LLM:

```markdown
Example classifier output:
```
intent: WORKFLOW_CREATE
confidence: 0.95
reasoning: User wants to create workflow
```
```

## For Developers

### Error Handling

Always use error-safe parsing in production:

```typescript
// ✅ GOOD - Handle errors gracefully
const result = parse(text);
if (!result.success) {
  console.error('Parse failed:', result.errors);
  return fallbackValue;
}
const data = result.data;

// ❌ BAD - Can crash production
const data = parseStrict(text); // Throws on error
```

### Validation

Validate critical LLM outputs before processing:

```typescript
// ✅ GOOD - Validate schema
const schema = schema()
  .field('intent', { type: 'string' }).required()
  .field('confidence', { type: 'number' }).required()
  .build();

const result = validate(data, schema);
if (!result.valid) {
  // Handle invalid data
}

// ❌ BAD - Trust LLM output blindly
const intent = data.intent; // Might not exist
```

### Logging

Log parse errors for debugging, but sanitize sensitive data:

```typescript
// ✅ GOOD - Log without exposing secrets
if (!result.success) {
  console.error('Loom parse failed:', {
    errors: result.errors,
    textLength: text.length,
    // Don't log the actual text if it might contain secrets
  });
}
```

### Format Consistency

Use formatters for consistent output:

```typescript
// ✅ GOOD - Use formatter for consistency
const loomText = formatPretty(workflowPlan);

// ❌ BAD - Manual string building
const loomText = `title: ${plan.title}\nsummary: ${plan.summary}`;
```

## Agent Integration

### System Prompt Template

```markdown
You are an AI agent that outputs structured data in Loom format.

## Loom Format Rules
- Key-value pairs: `key: value`
- Nesting: 2-space indentation
- Arrays: comma-separated inline, or `-` prefix for multi-line
- Types: auto-detected (string/number/boolean/null)
- Comments: `#` at line start

## Example Output
```
intent: WORKFLOW_CREATE
confidence: 0.95
entities:
  trigger: schedule
  service: slack
```

Output ONLY valid Loom format. No additional text.
```

### Response Parsing Pattern

```typescript
async function getAgentResponse(prompt: string): Promise<LoomObject> {
  const response = await llm.invoke(prompt);
  const result = parse(response);
  
  if (!result.success) {
    throw new Error(`Agent returned invalid Loom: ${result.errors[0]?.message}`);
  }
  
  return result.data!;
}
```

### Fallback Strategy

```typescript
// Try Loom first, fall back to JSON if parsing fails
function parseAgentOutput(text: string): object {
  const loomResult = parse(text);
  if (loomResult.success) {
    return loomResult.data!;
  }
  
  // Try JSON as fallback
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Agent output is neither valid Loom nor JSON');
  }
}
```

## Testing

### Unit Test Structure

```typescript
describe('Loom Agent Output', () => {
  it('should parse classifier response', () => {
    const text = `
intent: WORKFLOW_CREATE
confidence: 0.95
    `.trim();
    
    const result = parse(text);
    expect(result.success).toBe(true);
    expect(result.data?.intent).toBe('WORKFLOW_CREATE');
  });
});
```

### Integration Testing

Test with real LLM outputs:

```typescript
it('should parse actual LLM response', async () => {
  const response = await agent.invoke('Classify: create a Slack workflow');
  const result = parse(response);
  
  expect(result.success).toBe(true);
  expect(result.data?.intent).toBeDefined();
});
```

## Common Pitfalls

### ❌ Inconsistent Indentation
```
workflow:
  name: Test
    nodes:  # Wrong: 4 spaces instead of 2
```

### ✅ Consistent 2-Space Indentation
```
workflow:
  name: Test
  nodes:
    - id: node1
```

### ❌ Mixing Array Styles
```
tags: one, two
tags:
  - three
```

### ✅ Pick One Array Style
```
# Inline for simple values
tags: one, two, three

# Multi-line for objects
nodes:
  - id: node1
  - id: node2
```

### ❌ Forgetting Colons
```
title My Workflow  # Missing colon
```

### ✅ Always Use Colons
```
title: My Workflow
```

## Future Enhancements

Planned features for future versions:

- Multi-line string support (`|` and `>`)
- Inline comments
- Schema auto-generation from TypeScript types
- Browser DevTools formatter
- VSCode extension for syntax highlighting

