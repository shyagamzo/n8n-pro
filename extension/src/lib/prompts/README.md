# Agent Prompt Library

System prompts for the n8n extension's AI agents. Prompts are stored as Markdown files for easy editing and version control.

## Quick Start

```typescript
import { getAgentPrompt, buildPrompt } from './prompts';

// Get base prompt
const prompt = getAgentPrompt('planner');

// Build with dynamic context
const enrichedPrompt = buildPrompt('planner', {
  includeNodesReference: true,
  includeWorkflowPatterns: true,
  context: {
    availableCredentials: ['slackApi', 'gmailOAuth2']
  }
});
```

## Documentation

- **[Prompt Structure](./prompt-structure.md)** - Directory organization and file structure
- **[Authoring Guidelines](./authoring-guidelines.md)** - How to write and maintain prompts

## Agent Prompts

Each agent has a specific role:

- **[Classifier](./agents/classifier.md)** - Determines user intent (chat vs workflow)
- **[Enrichment](./agents/enrichment.md)** - Gathers requirements through conversation
- **[Planner](./agents/planner.md)** - Generates workflow plans
- **[Validator](./agents/validator.md)** - Validates plans (now a tool)
- **[Executor](./agents/executor.md)** - Creates workflows in n8n
- **[Narrator](./agents/narrator.md)** - Provides progress updates

## Shared Knowledge

- **[n8n Nodes Reference](./shared/n8n-nodes-reference.md)** - Available nodes and capabilities
- **[Workflow Patterns](./shared/workflow-patterns.md)** - Common workflow patterns
- **[Constraints](./shared/constraints.md)** - System limitations and guidelines

## Key Features

- **Markdown Format**: Easy editing without code changes
- **Dynamic Composition**: Inject context and shared knowledge at runtime
- **Version Controlled**: All changes tracked in git
- **Validated**: Prompt validation to catch missing files

## Usage Example

```typescript
import { buildPrompt } from './prompts';

const systemPrompt = buildPrompt('planner', {
  includeNodesReference: true,
  context: {
    availableCredentials: credentials.map(c => c.name),
    existingWorkflows: workflows.map(w => w.name)
  }
});

const agent = createReactAgent({
  llm: model,
  tools,
  prompt: systemPrompt
});
```

## See Also

- [prompt-loader.ts](./prompt-loader.ts) - Prompt loading and composition implementation
- [index.ts](./index.ts) - Public API exports

