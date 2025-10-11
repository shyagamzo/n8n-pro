# Loom Protocol

**Loom** is a lightweight, indentation-based protocol for structured data transmission between AI agents. It achieves ~40-60% token reduction compared to JSON while maintaining readability and ease of parsing.

## Quick Start

```typescript
import { parse, format } from './loom';

// Parse Loom text
const result = parse(`
title: Daily Report
enabled: true
count: 42
`);

// Format object to Loom
const loom = format({ title: "Test", count: 10 });
```

## Documentation

- **[Protocol Specification](./loom-protocol.md)** - Syntax, examples, and token efficiency
- **[API Reference](./loom-api.md)** - Complete API documentation for parsing, formatting, and validation
- **[Best Practices](./loom-best-practices.md)** - Guidelines for using Loom with LLMs and in production

## Key Features

- **Token Efficient**: 40-60% reduction vs JSON
- **Readable**: Indentation-based, no verbose syntax
- **Type-Safe**: Automatic type inference (string/number/boolean/null)
- **Flexible**: Inline or multi-line arrays, nested objects
- **Validated**: Schema validation for critical data

## When to Use

✅ **Good for:**
- Structured LLM output (intent classification, plans, entities)
- Multi-level nested data (workflow definitions, configs)
- Token-limited contexts

❌ **Not for:**
- Conversational responses (use plain text)
- Simple single values
- Binary data

## Example

**Input:**
```
intent: WORKFLOW_CREATE
confidence: 0.95
extractedEntities:
  trigger: schedule
  services: slack, email
```

**Output:**
```typescript
{
  intent: "WORKFLOW_CREATE",
  confidence: 0.95,
  extractedEntities: {
    trigger: "schedule",
    services: ["slack", "email"]
  }
}
```

## See Also

- [index.ts](./index.ts) - TypeScript exports
- [parser.ts](./parser.ts) - Parser implementation
- [formatter.ts](./formatter.ts) - Formatter implementation
- [validator.ts](./validator.ts) - Schema validation

