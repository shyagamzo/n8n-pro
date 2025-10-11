# Agent Prompt Authoring Guidelines

Best practices for writing and maintaining system prompts for AI agents.

## Writing Style

### Be Specific
- Use clear, unambiguous instructions
- Avoid vague language like "try to" or "maybe"
- Specify exact formats and structures
- Include constraints and boundaries

**Example:**
```markdown
❌ BAD: "Try to classify the user's intent"
✅ GOOD: "Classify the user's intent into one of: WORKFLOW_CREATE, WORKFLOW_EDIT, WORKFLOW_DELETE"
```

### Be Concise
- Remove unnecessary words
- Get to the point quickly
- Use bullet points over paragraphs
- Avoid redundant explanations

**Example:**
```markdown
❌ BAD: "You should consider using the schedule node if the user mentions anything related to time or scheduling"
✅ GOOD: "Use schedule node for time-based triggers"
```

### Be Consistent
- Use the same terminology across all prompts
- Follow the same structure in all agent prompts
- Maintain consistent formatting rules
- Align with project conventions

**Example:**
```markdown
# Consistent terminology
- "workflow" not "automation" or "flow"
- "node" not "step" or "action"
- "credential" not "auth" or "connection"
```

### Use Examples (Show, Don't Just Tell)
- Include 2-3 examples for each behavior
- Cover common and edge cases
- Show input → output transformations
- Use realistic scenarios

**Example:**
```markdown
## Examples

Input: "Send me a Slack message every day at 9 AM"
Output:
```
intent: WORKFLOW_CREATE
trigger: schedule
services: slack
frequency: daily
```
```

## Testing Prompts

### Test with Real Inputs
- Use actual user messages from logs
- Test edge cases and ambiguous inputs
- Verify output format consistency
- Check for hallucinations

```typescript
// Test examples
const testCases = [
  'Create a workflow',
  'Send Slack message daily',
  'I want to automate emails',
];

for (const input of testCases) {
  const output = await agent.invoke(input);
  console.log('Input:', input);
  console.log('Output:', output);
}
```

### Verify Output Format
- Ensure outputs match expected structure
- Validate against schemas
- Check for required fields
- Test with schema validation

```typescript
const schema = schema()
  .field('intent', { type: 'string' }).required()
  .field('confidence', { type: 'number' }).required()
  .build();

const result = validate(agentOutput, schema);
if (!result.valid) {
  console.error('Invalid output:', result.errors);
}
```

### Check Edge Cases
- Empty input
- Very long input
- Ambiguous requests
- Conflicting requirements
- Invalid references

### Monitor Token Usage
- Track prompt token counts
- Optimize for efficiency
- Remove unnecessary sections
- Test with different models

```typescript
const promptTokens = countTokens(systemPrompt);
console.log('Prompt tokens:', promptTokens);
// Aim for < 2000 tokens for system prompts
```

## Updating Prompts

### Small Tweaks
- Edit the markdown file directly
- Test thoroughly before committing
- Document the change in commit message
- Update version comments if present

### Major Changes
- Create a new version for A/B testing
- Compare performance metrics
- Gather feedback from multiple tests
- Migrate gradually if successful

### Breaking Changes
- Update prompt loader code if needed
- Update agent code to handle new format
- Update tests and validation schemas
- Document migration path

### Document Changes
- Always explain WHY the change was made
- Include example outputs before/after
- Reference issues or bugs if applicable
- Update related documentation

**Commit message example:**
```
📚 Update planner prompt to include credential hints

- Added section on credential requirements
- Reduced hallucinations about non-existent nodes
- Improved output consistency (95% → 98%)

Fixes #123
```

## Variables and Templates

### Dynamic Content Injection
Use placeholder comments for content that will be injected at runtime:

```markdown
# Available Credentials

<!-- Available credentials will be injected here -->

Use credentials from the list above when creating workflows.
```

### Template Processing
The prompt loader (`prompt-loader.ts`) handles variable substitution:

```typescript
const prompt = buildPrompt('planner', {
  includeNodesReference: true,
  context: {
    availableCredentials: ['slackApi', 'gmailOAuth2']
  }
});
```

## Prompt Structure Template

Each agent prompt should follow this structure:

```markdown
# [Agent Name]

You are [role description].

## Your Capabilities
- [capability 1]
- [capability 2]
- [capability 3]

## Input Format
[Description of what you receive]

## Output Format
[Description of what you produce]

[Example output structure]

## Rules and Constraints
- [constraint 1]
- [constraint 2]

## Examples

### Example 1: [Scenario]
Input: [example input]
Output:
```
[example output]
```

### Example 2: [Scenario]
Input: [example input]
Output:
```
[example output]
```

## Error Handling
[How to handle edge cases and errors]
```

## Version Control

### Tracking Changes
- All prompts are version-controlled in git
- Use meaningful commit messages
- Tag major versions for rollback
- Document breaking changes in commits

### Prompt Versions
Consider adding version comments to prompts:

```markdown
# Enrichment Agent
<!-- Version: 2.1 -->
<!-- Last Updated: 2024-01-15 -->
<!-- Changes: Added one-question-at-a-time constraint -->
```

### Rollback Strategy
If a prompt change causes issues:

1. Revert the commit: `git revert <commit-hash>`
2. Test the reverted version
3. Document why the change failed
4. Create a new approach with learnings

## Performance Monitoring

### Key Metrics
- **Accuracy**: Does it produce correct outputs?
- **Consistency**: Same input → same output?
- **Token efficiency**: Is the prompt optimized?
- **Latency**: How long does inference take?
- **Error rate**: How often does it fail?

### Testing Checklist

- [ ] Outputs match expected format
- [ ] All required fields present
- [ ] No hallucinations or invalid data
- [ ] Edge cases handled gracefully
- [ ] Token usage is reasonable
- [ ] Latency is acceptable
- [ ] Error messages are helpful
- [ ] Examples reflect real usage
- [ ] Documentation is up-to-date

