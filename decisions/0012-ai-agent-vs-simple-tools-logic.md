# Decision Record: AI Agent vs Simple Tools Logic

## Core Principle
**Workflow simplicity is prudent**: Prefer visually clean workflows with clear visual flows. Avoid complex or networked branches and node connections which will be difficult to process or follow with the naked eye.

## Decision Framework

### Prefer Simple Tools When:
- **Single-step operations**: Data transformation, validation, simple API calls
- **Clear visual flow**: Linear or simple branching patterns
- **Standard n8n nodes**: HTTP Request, Set, Filter, Code (simple scripts)
- **Predictable outcomes**: Well-defined inputs and outputs
- **Performance critical**: Fast execution, low latency requirements

### Use AI Agents When:
- **Multi-step reasoning**: Complex decision trees, conditional logic
- **Natural language processing**: Content analysis, sentiment, classification
- **Dynamic tool selection**: Agent needs to choose which tools to use
- **Unstructured data**: Processing emails, documents, images
- **Creative problem solving**: Generating content, suggesting solutions

## Visual Complexity Guidelines
- **Linear flows**: Prefer sequential node connections over complex branching
- **Clear separation**: Keep AI agent workflows separate from simple tool workflows
- **Minimal connections**: Avoid cross-connections and complex node networks
- **Readable patterns**: Use consistent node ordering and spacing

## Implementation Strategy
1. **Classifier determines approach**: Route to simple tools or AI agents based on complexity
2. **Simple tools first**: Default to regular n8n nodes unless AI is clearly needed
3. **AI agent isolation**: Keep AI agent workflows contained and focused
4. **Visual validation**: Review generated workflows for visual clarity before applying

## Examples

### Simple Tools (Preferred)
```
Trigger → HTTP Request → Set → Filter → Response
```

### AI Agent (When Needed)
```
Trigger → AI Agent (with tools) → Response
```

## Benefits
- **Maintainability**: Easier to debug and modify simple workflows
- **Performance**: Faster execution with fewer AI calls
- **Cost efficiency**: Reduced LLM usage for simple tasks
- **Visual clarity**: Cleaner, more understandable workflow diagrams

## Reference
Based on n8n's AI concepts: [AI concepts in n8n](https://docs.n8n.io/advanced-ai/intro-tutorial/)
