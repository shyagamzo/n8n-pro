/**
 * Loom Protocol - Validator
 *
 * Schema validation for Loom data structures.
 */

import type { LoomValue, LoomObject, LoomSchema, LoomFieldSchema, ValidationResult, ValidationError } from './types'

/**
 * Validate a value against a schema
 *
 * @example
 * ```ts
 * const schema = {
 *   title: { type: 'string', required: true },
 *   count: { type: 'number' },
 *   enabled: { type: 'boolean' }
 * };
 * const data = { title: "Test", count: 42 };
 * const result = validate(data, schema);
 * // result.valid = true
 * ```
 */
export function validate(value: LoomValue, schema: LoomSchema): ValidationResult
{
  const errors: ValidationError[] = []

  if (typeof value !== 'object' || value === null || Array.isArray(value))
  {
    errors.push({
      path: '$',
      message: 'Expected an object',
    })
    return { valid: false, errors }
  }

  validateObject(value as LoomObject, schema, '$', errors)

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate an object against a schema
 */
function validateObject(obj: LoomObject, schema: LoomSchema, path: string, errors: ValidationError[]): void
{
  // Check required fields
  for (const [key, fieldSchema] of Object.entries(schema))
  {
    if (fieldSchema.required && !(key in obj))
    {
      errors.push({
        path: `${path}.${key}`,
        message: 'Required field is missing',
      })
    }
  }

  // Validate each field
  for (const [key, value] of Object.entries(obj))
  {
    const fieldSchema = schema[key]

    if (!fieldSchema)
    {
      // Unknown field - skip in non-strict mode
      continue
    }

    const fieldPath = `${path}.${key}`
    validateField(value, fieldSchema, fieldPath, errors)
  }
}

/**
 * Validate a field against its schema
 */
function validateField(value: LoomValue, schema: LoomFieldSchema, path: string, errors: ValidationError[]): void
{
  // Type validation
  const actualType = getType(value)

  if (actualType !== schema.type)
  {
    errors.push({
      path,
      message: `Expected type ${schema.type}, got ${actualType}`,
    })
    return
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value))
  {
    errors.push({
      path,
      message: `Value must be one of: ${schema.enum.join(', ')}`,
    })
  }

  // Custom validation
  if (schema.validate)
  {
    const result = schema.validate(value)

    if (typeof result === 'string')
    {
      errors.push({ path, message: result })
    }
    else if (result === false)
    {
      errors.push({ path, message: 'Custom validation failed' })
    }
  }

  // Array item validation
  if (schema.type === 'array' && schema.items && Array.isArray(value))
  {
    value.forEach((item, index) =>
    {
      validateField(item, schema.items!, `${path}[${index}]`, errors)
    })
  }

  // Object property validation
  if (schema.type === 'object' && schema.properties && typeof value === 'object' && value !== null)
  {
    validateObject(value as LoomObject, schema.properties, path, errors)
  }
}

/**
 * Get the type of a value
 */
function getType(value: LoomValue): string
{
  if (value === null)
  {
    return 'null'
  }

  if (Array.isArray(value))
  {
    return 'array'
  }

  if (typeof value === 'object')
  {
    return 'object'
  }

  return typeof value
}

/**
 * Create a schema builder for fluent API
 */
export class SchemaBuilder
{
  _schema: LoomSchema = {}

  field(key: string, type: LoomFieldSchema['type']): FieldBuilder
  {
    return new FieldBuilder(this._schema, key, type)
  }

  build(): LoomSchema
  {
    return this._schema
  }
}

/**
 * Field builder for fluent schema definition
 */
class FieldBuilder
{
  _schema: LoomSchema
  _key: string
  _fieldSchema: LoomFieldSchema

  constructor(
    schema: LoomSchema,
    key: string,
    type: LoomFieldSchema['type']
  )
  {
    this._schema = schema
    this._key = key
    this._fieldSchema = { type }
    this._schema[key] = this._fieldSchema
  }

  required(): this
  {
    this._fieldSchema.required = true
    return this
  }

  enum(values: unknown[]): this
  {
    this._fieldSchema.enum = values
    return this
  }

  validate(fn: (value: unknown) => boolean | string): this
  {
    this._fieldSchema.validate = fn
    return this
  }

  items(type: LoomFieldSchema['type']): this
  {
    this._fieldSchema.items = { type }
    return this
  }

  properties(schema: LoomSchema): this
  {
    this._fieldSchema.properties = schema
    return this
  }

  field(key: string, type: LoomFieldSchema['type']): FieldBuilder
  {
    return new FieldBuilder(this._schema, key, type)
  }

  build(): LoomSchema
  {
    return this._schema
  }
}

/**
 * Helper to create a schema
 */
export function schema(): SchemaBuilder
{
  return new SchemaBuilder()
}

