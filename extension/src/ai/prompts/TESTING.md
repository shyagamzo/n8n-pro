# Testing the Prompt System

## Build-Time Validation

The prompts are tested at build time. If the build succeeds, all prompts are loaded correctly:

```bash
yarn build
```

✅ **Build successful** = All prompts loaded and typed correctly

## Runtime Validation

To validate prompts at runtime, use the browser console:

### 1. Open the Extension Panel

Load the extension and open the chat panel in n8n.

### 2. Check Prompt Loading

Open Chrome DevTools console and run:

```javascript
// Check if prompts module is available
const prompts = await import('./lib/prompts/index')

// Validate all prompts loaded
const validation = prompts.validatePrompts()
console.log('Validation:', validation)
// Expected: { valid: true, missing: [] }

// Test each agent prompt
console.log('Classifier:', prompts.getAgentPrompt('classifier').substring(0, 100))
console.log('Enrichment:', prompts.getAgentPrompt('enrichment').substring(0, 100))
console.log('Planner:', prompts.getAgentPrompt('planner').substring(0, 100))
console.log('Executor:', prompts.getAgentPrompt('executor').substring(0, 100))

// Test prompt composition
const fullPrompt = prompts.buildPrompt('planner', {
  includeNodesReference: true,
  includeWorkflowPatterns: true,
  includeConstraints: true
})
console.log('Full planner prompt size:', fullPrompt.length, 'chars')
console.log('Estimated tokens:', Math.ceil(fullPrompt.length / 4))
```

### 3. Test Orchestrator Integration

Check that the orchestrator uses prompts:

```javascript
// In background service worker console
// Send a test message and verify system prompt is included
```

## Manual Testing Checklist

- [ ] Build completes without errors
- [ ] All 4 agent prompts load (classifier, enrichment, planner, executor)
- [ ] All 3 shared knowledge files load (nodes, patterns, constraints)
- [ ] Prompt composition works (includeNodesReference, includeWorkflowPatterns, includeConstraints)
- [ ] Context injection works
- [ ] Orchestrator includes system prompt in messages
- [ ] Extension loads in browser without console errors
- [ ] Chat responses use the n8n knowledge from prompts

## Expected Behavior

### Agent Prompts
Each agent prompt should:
- Define the agent's role clearly
- List capabilities
- Provide output format examples
- Include constraints
- Be > 1000 characters

### Shared Knowledge
- **n8n-nodes-reference.md**: List of n8n nodes with parameters
- **workflow-patterns.md**: Common workflow patterns and anti-patterns
- **constraints.md**: System-wide rules and constraints

### Prompt Composition
- Base prompt: Just the agent prompt
- With options: Agent prompt + selected shared knowledge
- With context: Agent prompt + shared knowledge + dynamic context

## Troubleshooting

### Build Fails with Module Error
**Problem:** `Cannot find module '*.md?raw'`

**Solution:** Check `vite-env.d.ts` includes the module declaration:
```typescript
declare module '*.md?raw' {
  const content: string
  export default content
}
```

### Prompts Not Loading at Runtime
**Problem:** `validatePrompts()` returns missing prompts

**Solution:**
1. Check that markdown files exist in `src/lib/prompts/agents/` and `src/lib/prompts/shared/`
2. Verify file names match imports in `index.ts`
3. Rebuild the extension: `yarn build`

### System Prompt Not Applied
**Problem:** Agent doesn't seem to use the system prompt

**Solution:**
1. Check orchestrator imports and uses `buildPrompt()`
2. Verify system message is prepended to messages array
3. Check OpenAI API receives the system message
4. Review prompt content for clarity

## Future: Automated Tests

When test infrastructure is added (vitest), create:

- `prompts.test.ts`: Unit tests for prompt loading and composition
- `integration.test.ts`: Integration tests with mock LLM
- `snapshot.test.ts`: Snapshot tests for prompt content stability

