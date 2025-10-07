/**
 * Loom Protocol
 *
 * A lightweight indentation-based protocol for structured data transmission.
 * Optimized for LLM token efficiency with ~60% reduction compared to JSON.
 *
 * @example
 * ```ts
 * import { parse, format } from './loom';
 *
 * // Parse Loom text
 * const text = `
 * title: Daily Report
 * enabled: true
 * count: 42
 * `;
 * const data = parse(text).data;
 *
 * // Format object to Loom
 * const loom = format({ title: "Test", count: 10 });
 * ```
 */

export { parse, parseStrict } from './parser'
export { format, formatCompact, formatPretty } from './formatter'
export { validate, schema, SchemaBuilder } from './validator'

export type {
  LoomValue,
  LoomObject,
  ParseOptions,
  ParseResult,
  ParseError,
  FormatOptions,
  LoomSchema,
  LoomFieldSchema,
  ValidationResult,
  ValidationError,
} from './types'

