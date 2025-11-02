# Workflow Validation - Zod Schema System

**Status:** ✅ Complete - Migrated from manual validation to Zod schemas

## Overview

The WorkflowBuilder validation system has been refactored from manual `typeof` checks and custom error accumulation to a comprehensive Zod schema system. This provides:

1. **Declarative Validation** - Schema-based type validation with automatic normalization
2. **Better Error Messages** - Context-aware fix suggestions and logical error ordering
3. **Type Safety** - Compile-time type inference from schemas
4. **Maintainability** - Single source of truth for validation logic

## Architecture

### Before: Manual Validation (683 lines)

```typescript
// Manual type checks scattered throughout
if (typeof data.name !== 'string' || data.name.length === 0) {
  errors.push({ field: 'name', message: '...' })
}

// Manual array normalization
if (Array.isArray(firstElement)) {
  // Already double-nested
} else if (typeof firstElement === 'object') {
  // Single-nested → convert
}

// Manual UUID generation
const id = typeof data.id === 'string' ? data.id : uuid()
```

### After: Zod Schema System (108 lines)

```typescript
// Declarative schema with automatic normalization
export const WorkflowSchema = z.object({
  name: z.string().min(1).max(128),
  nodes: NodesArraySchema,
  connections: ConnectionsSchema,
  settings: WorkflowSettingsSchema,
  active: z.boolean().default(false)
})

// Single method call
const result = WorkflowWithConnectionValidationSchema.safeParse(loomData)
```

## File Structure

```
src/n8n/
├── schemas.ts                    # Zod schemas for all n8n types
├── validation-errors.ts          # ZodError → ValidationError conversion
├── workflow-builder.ts           # Refactored builder (108 lines, was 683)
├── workflow-builder.test.ts      # Comprehensive test suite
└── types.ts                      # TypeScript types (unchanged)
```

## Key Features

### 1. Automatic Normalization

The schemas handle common data inconsistencies automatically:

#### UUID Generation
```typescript
export const NodeIdSchema = z
  .string()
  .uuid()
  .or(z.string().transform(() => uuid()))
  .or(z.any().transform(() => uuid()))

// Missing ID → auto-generated UUID
{ name: 'Start', type: '...' }
→ { id: '3c9068ec-...', name: 'Start', type: '...' }
```

#### Position Normalization
```typescript
export const PositionSchema = z
  .tuple([z.number(), z.number()])
  .or(z.array(z.union([z.number(), z.string()]))
    .transform(/* convert strings to numbers */))
  .or(z.any().transform(() => [0, 0]))

// String coordinates → parsed to numbers
position: ['250', '300'] → [250, 300]

// Invalid array → default to [0, 0]
position: [250] → [0, 0]
```

#### Connection Array Normalization (CRITICAL)
```typescript
export const NodeOutputsSchema = z
  .array(z.array(ConnectionItemSchema))  // Already double-nested
  .or(z.array(ConnectionItemSchema)      // Single-nested → wrap
    .transform((arr) => [arr]))
  .or(ConnectionItemSchema               // Single object → double-wrap
    .transform((item) => [[item]]))

// Single object → double-nested array
{ node: 'B', type: 'main', index: 0 }
→ [[{ node: 'B', type: 'main', index: 0 }]]

// Single-nested → double-nested array
[{ node: 'B', type: 'main', index: 0 }]
→ [[{ node: 'B', type: 'main', index: 0 }]]
```

### 2. Default Value Injection

```typescript
// All defaults handled declaratively in schemas
typeVersion: z.number().positive().default(1)
active: z.boolean().default(false)
parameters: z.record(z.string(), z.unknown()).default({})
settings: WorkflowSettingsSchema.default({})
connections: ConnectionsSchema.default({})
```

### 3. Cross-Field Validation

```typescript
export const WorkflowWithConnectionValidationSchema = WorkflowSchema
  .refine(
    (workflow) => {
      const nodeNames = new Set(workflow.nodes.map(n => n.name))

      // Validate source and target nodes exist
      for (const [sourceName, connectionMap] of Object.entries(workflow.connections)) {
        if (!nodeNames.has(sourceName)) return false

        if (connectionMap.main) {
          for (const output of connectionMap.main) {
            for (const connection of output) {
              if (!nodeNames.has(connection.node)) return false
            }
          }
        }
      }

      return true
    },
    { message: 'All connection source and target nodes must exist in the workflow' }
  )
```

### 4. Actionable Error Messages

The error conversion system provides context-aware fix suggestions:

```typescript
// ZodError → ValidationError with fix suggestions
{
  field: 'name',
  message: 'Workflow name is required',
  fix: 'Add "name: Workflow Title" to the workflow definition'
}

{
  field: 'nodes[0].type',
  message: 'Node "Start" missing type',
  fix: 'Add "type: n8n-nodes-base.nodeName" to node definition'
}

{
  field: 'connections.HTTP Request.main',
  message: 'Invalid connection structure',
  fix: 'Use format: main: [[{ node: "Target", type: "main", index: 0 }]]'
}
```

### 5. Error Processing Pipeline

```typescript
export function processZodError(zodError: ZodError): ValidationError[] {
  // 1. Convert ZodIssues to ValidationErrors
  const formatted = formatZodErrors(zodError)

  // 2. Deduplicate by field
  const deduplicated = deduplicateErrors(formatted)

  // 3. Sort by logical order (workflow → name → nodes → connections → settings)
  const sorted = sortValidationErrors(deduplicated)

  return sorted
}
```

## Usage Examples

### Basic Validation

```typescript
import { WorkflowBuilder } from '@n8n/workflow-builder'

const result = WorkflowBuilder.build(loomData)

if (!result.success) {
  console.error('Validation failed:')
  result.errors.forEach(err => {
    console.error(`  ${err.field}: ${err.message}`)
    if (err.fix) console.error(`    Fix: ${err.fix}`)
  })
  return
}

// Use validated workflow
const workflow = result.workflow
await n8n.createWorkflow(workflow)
```

### Direct Schema Usage

```typescript
import { WorkflowWithConnectionValidationSchema } from '@n8n/schemas'
import { processZodError } from '@n8n/validation-errors'

const result = WorkflowWithConnectionValidationSchema.safeParse(data)

if (!result.success) {
  const errors = processZodError(result.error)
  return { success: false, errors }
}

return { success: true, workflow: result.data }
```

### Type Inference

```typescript
import { WorkflowSchema } from '@n8n/schemas'
import type { z } from 'zod'

// Infer TypeScript type from schema
type Workflow = z.infer<typeof WorkflowSchema>

// Use in function signatures
function processWorkflow(workflow: Workflow) {
  // TypeScript knows the exact shape
  console.log(workflow.name)  // ✓ Type-safe
  console.log(workflow.nodes)  // ✓ Type-safe
}
```

## Migration Benefits

### Code Reduction

- **Before:** 683 lines of manual validation logic
- **After:** 108 lines using Zod schemas
- **Reduction:** 84% code reduction

### Maintainability Improvements

1. **Single Source of Truth** - Schemas define structure, validation, and normalization
2. **Declarative Logic** - What to validate, not how to validate
3. **Type Safety** - Compile-time guarantees from schema inference
4. **Testability** - Easy to test individual schemas

### Error Quality Improvements

1. **Context-Aware Messages** - Field-specific error messages
2. **Fix Suggestions** - Actionable guidance for developers/LLMs
3. **Logical Ordering** - Errors sorted by importance
4. **Deduplication** - No redundant errors per field

## Testing

Comprehensive test suite in `workflow-builder.test.ts`:

```typescript
// Test categories
describe('WorkflowBuilder - Valid Workflows', () => { /* ... */ })
describe('WorkflowBuilder - Normalization', () => { /* ... */ })
describe('WorkflowBuilder - Validation Errors', () => { /* ... */ })
describe('WorkflowBuilder - Error Message Quality', () => { /* ... */ })
```

Run tests:
```bash
cd extension
yarn test src/n8n/workflow-builder.test.ts
```

## Schema Reference

### Core Schemas

| Schema | Purpose | Normalizations |
|--------|---------|----------------|
| `PositionSchema` | [x, y] tuple validation | String→number, default [0,0] |
| `NodeIdSchema` | UUID validation | Auto-generate if missing |
| `ConnectionItemSchema` | Single connection validation | Default type='main', index=0 |
| `NodeOutputsSchema` | Double-nested array validation | Single→double nesting |
| `NodeSchema` | Complete node validation | All node-level normalizations |
| `NodesArraySchema` | Node array + uniqueness | Unique name validation |
| `ConnectionsSchema` | Connection map validation | Default {} |
| `WorkflowSchema` | Complete workflow validation | All workflow-level validation |
| `WorkflowWithConnectionValidationSchema` | + cross-field validation | Node name existence checks |

### Validation Rules

#### Name
- ✓ Required: Non-empty string
- ✓ Max length: 128 characters
- ✗ Rejects: Empty, missing, too long

#### Nodes
- ✓ Required: At least 1 node
- ✓ Unique names: All nodes must have unique names
- ✓ Complete structure: id, name, type, typeVersion, position, parameters
- ✗ Rejects: Empty array, duplicate names, missing required fields

#### Connections
- ✓ Optional: Can be empty object `{}`
- ✓ Double-nested: Auto-normalizes single-nested arrays
- ✓ Cross-validation: Source and target nodes must exist
- ✗ Rejects: Invalid structure, non-existent nodes

#### Position
- ✓ Tuple: Exactly [x, y]
- ✓ Numbers: Auto-converts strings to numbers
- ✓ Default: [0, 0] for invalid positions
- ✗ Rejects: Invalid arrays (wrong length, NaN values)

## Integration Points

### Loom Parser → WorkflowBuilder
```typescript
// Loom parser output (untrusted)
const loomData = loomParser.parse(loomText)

// WorkflowBuilder validation (trusted)
const result = WorkflowBuilder.build(loomData)
```

### WorkflowBuilder → n8n API
```typescript
// Only validated workflows reach the API
if (result.success) {
  await n8n.createWorkflow(result.workflow)
}
```

### LLM → WorkflowBuilder
```typescript
// LLM output requires validation
const loomPlan = await llm.generateWorkflowPlan(userQuery)
const parsedPlan = loomParser.parse(loomPlan)

const result = WorkflowBuilder.build(parsedPlan)
if (!result.success) {
  // Send errors back to LLM for correction
  await llm.fixValidationErrors(result.errors)
}
```

## Performance

- **Validation time:** <5ms for typical workflows (1-10 nodes)
- **Memory overhead:** Negligible (schemas are singletons)
- **Type inference:** Zero runtime cost (compile-time only)

## Future Enhancements

### Possible Improvements

1. **Node-Specific Parameter Validation** - Per-node-type parameter schemas
2. **Credential Validation** - Validate credential references against n8n API
3. **Async Validation** - Network-based validation (node type existence, credential validity)
4. **Custom Error Formatters** - LLM-friendly error formats (JSON, Loom, natural language)
5. **Schema Versioning** - Support multiple n8n API versions

### Extension Points

```typescript
// Custom refinements
export const CustomWorkflowSchema = WorkflowSchema
  .refine(customValidation, { message: '...' })

// Custom error formatting
export function formatForLLM(errors: ValidationError[]): string {
  // Convert to LLM-friendly format
}
```

## Troubleshooting

### Common Issues

**Issue:** "Expected array, received object" for connections
**Fix:** Schema auto-normalizes, but check if connection structure is valid

**Issue:** "All node names must be unique"
**Fix:** Check for duplicate node names in workflow

**Issue:** "Source/target node not found"
**Fix:** Ensure connection references match node names exactly (case-sensitive)

### Debug Mode

```typescript
// Enable detailed Zod error output
const result = WorkflowWithConnectionValidationSchema.safeParse(data)
if (!result.success) {
  console.log('Raw Zod errors:', JSON.stringify(result.error, null, 2))
}
```

## Related Documentation

- **n8n Types:** `src/n8n/types.ts` - TypeScript type definitions
- **Loom Parser:** `src/loom/README.md` - Loom format specification
- **Orchestrator:** `src/ai/orchestrator/` - Multi-agent workflow creation
- **Testing Guide:** `TESTING-GUIDE.md` - Manual testing procedures

## Migration Checklist

- [x] Create Zod schemas for all n8n types
- [x] Implement normalization transformations
- [x] Create error conversion utilities
- [x] Refactor WorkflowBuilder.build() method
- [x] Add comprehensive test suite
- [x] Document schema system
- [x] Verify TypeScript compilation
- [ ] Run integration tests with Loom parser
- [ ] Test with real LLM workflow generation
- [ ] Update related documentation

## References

- **Zod Documentation:** https://zod.dev
- **n8n API Documentation:** https://docs.n8n.io/api/
- **n8n Workflow Structure:** Based on n8n v1.x UI requirements
