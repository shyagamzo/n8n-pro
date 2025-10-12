# Loom API Reference

Complete API documentation for parsing, formatting, and validating Loom data.

## Parsing

### parse(text: string): ParseResult

Parse Loom text with error handling.

**Parameters:**
- `text` - Loom-formatted string to parse

**Returns:** ParseResult object with success status

```typescript
import { parse } from './loom';

const result = parse(text);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.errors);
}
```

### parseStrict(text: string): LoomObject

Parse Loom text, throwing on error.

**Parameters:**
- `text` - Loom-formatted string to parse

**Returns:** Parsed object

**Throws:** ParseError if parsing fails

```typescript
import { parseStrict } from './loom';

try {
  const data = parseStrict(text);
  console.log(data);
} catch (error) {
  console.error('Parse error:', error);
}
```

## Formatting

### format(obj: LoomObject): string

Format an object as Loom text.

**Parameters:**
- `obj` - Object to format

**Returns:** Loom-formatted string

```typescript
import { format } from './loom';

const obj = { title: "Test", count: 42 };
const loom = format(obj);
console.log(loom);
// Output:
// title: Test
// count: 42
```

### formatCompact(obj: LoomObject): string

Format with minimal whitespace.

**Parameters:**
- `obj` - Object to format

**Returns:** Compact Loom-formatted string

```typescript
import { formatCompact } from './loom';

const compact = formatCompact(obj);
// More compact output, single line where possible
```

### formatPretty(obj: LoomObject): string

Format with sorted keys and consistent spacing.

**Parameters:**
- `obj` - Object to format

**Returns:** Pretty Loom-formatted string

```typescript
import { formatPretty } from './loom';

const pretty = formatPretty(obj);
// Keys sorted alphabetically for consistency
```

## Validation

### validate(data: unknown, schema: LoomSchema): ValidationResult

Validate data against a schema.

**Parameters:**
- `data` - Data to validate
- `schema` - Schema definition

**Returns:** ValidationResult with valid flag and errors

```typescript
import { validate, schema } from './loom';

const mySchema = schema()
  .field('title', { type: 'string' }).required()
  .field('count', { type: 'number' })
  .build();

const result = validate(data, mySchema);
if (!result.valid) {
  console.error(result.errors);
}
```

### schema(): SchemaBuilder

Create a new schema builder.

**Returns:** SchemaBuilder instance

```typescript
import { schema } from './loom';

const mySchema = schema()
  .field('title', { type: 'string' }).required()
  .field('enabled', { type: 'boolean' })
  .build();
```

## Types

### LoomValue
```typescript
type LoomValue = string | number | boolean | null | LoomObject | LoomValue[]
```

### LoomObject
```typescript
type LoomObject = Record<string, LoomValue>
```

### ParseResult
```typescript
type ParseResult = {
  success: boolean
  data?: LoomObject
  errors?: ParseError[]
}
```

### ParseError
```typescript
type ParseError = {
  line: number
  message: string
  context?: string
}
```

### ValidationResult
```typescript
type ValidationResult = {
  valid: boolean
  errors?: ValidationError[]
}
```

### ValidationError
```typescript
type ValidationError = {
  field: string
  message: string
  value?: unknown
}
```

## Performance

- **Parsing**: ~0.1ms for typical agent responses (< 1KB)
- **Formatting**: ~0.05ms for typical objects
- **Memory**: Negligible overhead vs JSON
- **Bundle Size**: ~5KB minified

