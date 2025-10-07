# Agent Prompt Library

This directory contains system prompts for the n8n extension's AI agents.

## Structure

```
prompts/
├── agents/           # Agent-specific system prompts
│   ├── classifier.md
│   ├── enrichment.md
│   ├── planner.md
│   └── executor.md
├── shared/           # Shared knowledge and constraints
│   ├── n8n-nodes-reference.md
│   ├── workflow-patterns.md
│   └── constraints.md
└── index.ts          # Prompt loader utility
```

## Authoring Guidelines

### Prompt Structure
Each agent prompt should include:
1. **Role Definition**: Who the agent is and what it does
2. **Capabilities**: What the agent can and cannot do
3. **Input/Output Format**: Expected input and output structure
4. **Examples**: Few-shot examples for common scenarios
5. **Constraints**: Rules and limitations

### Writing Style
- **Be specific**: Clear, unambiguous instructions
- **Be concise**: Remove unnecessary words
- **Be consistent**: Use the same terminology across prompts
- **Use examples**: Show don't just tell
- **Version control**: Document prompt changes in git commits

### Testing Prompts
1. Test with real user inputs
2. Verify output format matches expectations
3. Check edge cases and error scenarios
4. Monitor token usage and performance

### Updating Prompts
- Small tweaks: Edit the markdown file directly
- Major changes: Create a new version and A/B test
- Breaking changes: Update prompt loader and agent code
- Always document the reason for changes in commits

## Variables and Templates
For dynamic content (e.g., available credentials, workflow context), use placeholder comments:
```markdown
<!-- Available credentials will be injected here -->
```

The prompt loader (`index.ts`) handles variable substitution.

