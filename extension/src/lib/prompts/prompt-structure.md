# Prompt Structure and Organization

How system prompts are organized and structured in the n8n extension.

## Directory Structure

```
prompts/
├── agents/           # Agent-specific system prompts
│   ├── classifier.md       # Intent classification
│   ├── enrichment.md       # Requirement gathering
│   ├── planner.md          # Workflow planning
│   ├── validator.md        # Plan validation
│   ├── executor.md         # Workflow execution
│   └── narrator.md         # Progress narration
├── shared/           # Shared knowledge base
│   ├── n8n-nodes-reference.md    # Available n8n nodes
│   ├── workflow-patterns.md      # Common patterns
│   └── constraints.md            # System constraints
├── prompt-loader.ts  # Prompt loading and composition
├── index.ts          # Public API exports
└── README.md         # This documentation
```

## Agent Prompts

### Purpose
Each agent has a specific role in the multi-agent system:

- **Classifier**: Determines user intent (chat vs workflow creation)
- **Enrichment**: Gathers requirements through conversation
- **Planner**: Generates workflow plans
- **Validator**: Validates plans before execution (now a tool)
- **Executor**: Creates workflows in n8n
- **Narrator**: Provides progress updates to users

### Format
Agent prompts are written in Markdown for:
- Easy editing without code changes
- Clear formatting and structure
- Version control friendliness
- Human readability

### Standard Structure

```markdown
# [Agent Name]

[Role description - what this agent does]

## Capabilities
[What this agent can do]

## Input
[What data this agent receives]

## Output
[What data this agent produces]

## Rules
[Constraints and guidelines]

## Examples
[Few-shot examples]

## Error Handling
[How to handle edge cases]
```

## Shared Knowledge

### n8n-nodes-reference.md
Documentation of available n8n nodes for workflow creation:
- Node types and capabilities
- Common use cases
- Parameter formats
- Connection patterns

### workflow-patterns.md
Common workflow patterns and best practices:
- Schedule-based workflows
- Webhook-triggered workflows
- Data transformation patterns
- Error handling patterns

### constraints.md
System-wide constraints and limitations:
- What the extension can and cannot do
- n8n API limitations
- Security considerations
- Performance guidelines

## Prompt Composition

### Basic Loading

```typescript
import { getAgentPrompt } from './prompts';

const prompt = getAgentPrompt('planner');
```

### Advanced Composition

```typescript
import { buildPrompt } from './prompts';

const prompt = buildPrompt('planner', {
  includeNodesReference: true,
  includeWorkflowPatterns: true,
  context: {
    availableCredentials: ['slackApi', 'gmailOAuth2'],
    existingWorkflows: ['Daily Report', 'Weekly Summary']
  }
});
```

### Dynamic Context

The prompt loader can inject dynamic context:

```typescript
export type PromptOptions = {
  includeNodesReference?: boolean
  includeWorkflowPatterns?: boolean
  includeConstraints?: boolean
  context?: Record<string, unknown>
}
```

Context is formatted and appended to the base prompt:

```markdown
---

# Current Context

## Available Credentials
- slackApi
- gmailOAuth2

## Existing Workflows
- Daily Report
- Weekly Summary
```

## Integration with Agents

### LangChain Integration

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { getAgentPrompt } from '../prompts';

const model = new ChatOpenAI({ 
  modelName: 'gpt-4o-mini',
  temperature: 0 
});

const systemPrompt = getAgentPrompt('planner');
const agent = createReactAgent({
  llm: model,
  tools,
  prompt: systemPrompt
});
```

### Prompt Validation

Ensure all prompts are loaded correctly:

```typescript
import { validatePrompts } from './prompts';

const validation = validatePrompts();
if (!validation.valid) {
  console.error('Missing prompts:', validation.missing);
}
```

## File Naming Conventions

- **Agent prompts**: lowercase with hyphens (`enrichment.md`)
- **Shared knowledge**: descriptive names (`n8n-nodes-reference.md`)
- **No versioning in filenames**: Use git for version tracking
- **Markdown extension**: `.md` for all prompt files

## Import Mechanism

Prompts are imported using Vite's `?raw` suffix:

```typescript
import enrichmentPrompt from './agents/enrichment.md?raw'
```

This loads the file content as a string at build time.

## Best Practices

### Keep Prompts Focused
- Each prompt should have ONE clear purpose
- Don't try to make a prompt do too much
- Split complex behaviors into multiple agents

### Use Shared Knowledge
- Don't duplicate information across prompts
- Reference shared knowledge sections
- Use the composition API to include shared docs

### Maintain Consistency
- Use the same terminology everywhere
- Follow the standard structure
- Keep formatting consistent

### Optimize for Tokens
- Remove unnecessary words
- Use bullet points over paragraphs
- Include only essential examples
- Test and measure token usage

### Version Control
- Commit prompt changes separately
- Write descriptive commit messages
- Tag major versions
- Document breaking changes

## Testing Strategy

### Unit Testing
Test individual prompts in isolation:

```typescript
describe('Enrichment Prompt', () => {
  it('should load without errors', () => {
    const prompt = getAgentPrompt('enrichment');
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(0);
  });
});
```

### Integration Testing
Test prompts with actual LLM calls:

```typescript
it('should generate valid output', async () => {
  const agent = createAgent('planner');
  const output = await agent.invoke('Create a daily Slack workflow');
  
  const result = parse(output); // Validate Loom format
  expect(result.success).toBe(true);
});
```

### Regression Testing
Track prompt performance over time:

```typescript
const testCases = loadTestCases();
const results = [];

for (const testCase of testCases) {
  const output = await agent.invoke(testCase.input);
  results.push({
    input: testCase.input,
    output,
    expected: testCase.expected,
    passed: isMatch(output, testCase.expected)
  });
}

// Track pass rate over versions
console.log('Pass rate:', calculatePassRate(results));
```

