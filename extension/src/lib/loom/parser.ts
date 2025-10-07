/**
 * Loom Protocol - Parser
 *
 * Converts Loom text format to JavaScript objects.
 */

import type { LoomValue, LoomObject, ParseOptions, ParseResult, ParseError } from './types'

const DEFAULT_OPTIONS: Required<ParseOptions> = {
  allowComments: true,
  strict: true,
  inferTypes: true,
}

/**
 * Parse Loom text into JavaScript object
 *
 * @example
 * ```ts
 * const text = `
 * title: Daily Report
 * enabled: true
 * count: 42
 * tags:
 *   - urgent
 *   - daily
 * `;
 * const result = parse(text);
 * // result.data = { title: "Daily Report", enabled: true, count: 42, tags: ["urgent", "daily"] }
 * ```
 */
export function parse<T = LoomObject>(text: string, options: ParseOptions = {}): ParseResult<T>
{
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const errors: ParseError[] = []
  const lines = text.split('\n')

  try
  {
    const data = parseLines(lines, 0, lines.length, 0, opts, errors)
    return {
      data: data as T,
      errors,
      success: errors.length === 0,
    }
  }
  catch (error)
  {
    errors.push({
      line: 0,
      message: (error as Error).message,
      content: '',
    })
    return {
      data: {} as T,
      errors,
      success: false,
    }
  }
}

/**
 * Parse a range of lines into an object
 */
function parseLines(
  lines: string[],
  start: number,
  end: number,
  baseIndent: number,
  options: Required<ParseOptions>,
  errors: ParseError[]
): LoomObject
{
  const result: LoomObject = {}
  let i = start

  while (i < end)
  {
    const line = lines[i]
    const lineNum = i + 1

    // Skip empty lines
    if (!line.trim())
    {
      i++
      continue
    }

    // Skip comments
    if (options.allowComments && line.trim().startsWith('#'))
    {
      i++
      continue
    }

    const indent = getIndent(line)

    // Skip lines with less indent (they belong to parent)
    if (indent < baseIndent)
    {
      break
    }

    // Skip lines with more indent (should have been consumed by previous key)
    if (indent > baseIndent)
    {
      i++
      continue
    }

    const trimmed = line.trim()

    // Array item
    if (trimmed.startsWith('-'))
    {
      // This shouldn't happen at object level
      if (options.strict)
      {
        errors.push({
          line: lineNum,
          message: 'Array items must be under a key',
          content: line,
        })
      }

      i++
      continue
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(':')

    if (colonIndex === -1)
    {
      if (options.strict)
      {
        errors.push({
          line: lineNum,
          message: 'Invalid syntax: expected key:value',
          content: line,
        })
      }

      i++
      continue
    }

    const key = trimmed.slice(0, colonIndex).trim()
    const valueText = trimmed.slice(colonIndex + 1).trim()

    // Check if next lines are indented (nested value)
    const nextIndent = i + 1 < end ? getIndent(lines[i + 1]) : 0

    if (nextIndent > indent)
    {
      // Nested structure - check if array or object
      const nextLine = lines[i + 1].trim()

      if (nextLine.startsWith('-'))
      {
        // Array
        const { array, consumed } = parseArray(lines, i + 1, end, nextIndent, options, errors)
        result[key] = array
        i += consumed + 1
      }
      else
      {
        // Object
        const endIndex = findBlockEnd(lines, i + 1, end, nextIndent)
        result[key] = parseLines(lines, i + 1, endIndex, nextIndent, options, errors)
        i = endIndex
      }
    }
    else
    {
      // Simple value
      result[key] = parseValue(valueText, options)
      i++
    }
  }

  return result
}

/**
 * Parse array items
 */
function parseArray(
  lines: string[],
  start: number,
  end: number,
  baseIndent: number,
  options: Required<ParseOptions>,
  errors: ParseError[]
): { array: LoomValue[]; consumed: number }
{
  const array: LoomValue[] = []
  let i = start

  while (i < end)
  {
    const line = lines[i]
    const indent = getIndent(line)

    // Stop if indent is less than base
    if (indent < baseIndent)
    {
      break
    }

    // Skip if indent is more (nested content, already consumed)
    if (indent > baseIndent)
    {
      i++
      continue
    }

    const trimmed = line.trim()

    // Not an array item
    if (!trimmed.startsWith('-'))
    {
      break
    }

    const itemText = trimmed.slice(1).trim()

    // Check if next lines are indented (nested item)
    const nextIndent = i + 1 < end ? getIndent(lines[i + 1]) : 0

    if (nextIndent > indent)
    {
      // Nested content under array item
      const nextLine = lines[i + 1].trim()

      if (nextLine.startsWith('-'))
      {
        // Nested array
        const { array: nestedArray, consumed } = parseArray(lines, i + 1, end, nextIndent, options, errors)
        if (itemText)
        {
          // Item has inline value plus nested array - treat as object
          array.push({ value: parseValue(itemText, options), nested: nestedArray })
        }
        else
        {
          array.push(nestedArray)
        }
        i += consumed + 1
      }
      else
      {
        // Nested object
        const endIndex = findBlockEnd(lines, i + 1, end, nextIndent)
        const obj = parseLines(lines, i + 1, endIndex, nextIndent, options, errors)

        if (itemText)
        {
          // Item has inline key-value plus nested properties
          const colonIndex = itemText.indexOf(':')
          if (colonIndex > 0)
          {
            const key = itemText.slice(0, colonIndex).trim()
            const value = itemText.slice(colonIndex + 1).trim()
            array.push({ ...obj, [key]: parseValue(value, options) })
          }
          else
          {
            // No colon, treat as simple value with nested object
            array.push({ _value: parseValue(itemText, options), ...obj })
          }
        }
        else
        {
          array.push(obj)
        }
        i = endIndex
      }
    }
    else
    {
      // Simple value
      array.push(parseValue(itemText, options))
      i++
    }
  }

  return { array, consumed: i - start }
}

/**
 * Parse a single value with type inference
 */
function parseValue(text: string, options: Required<ParseOptions>): LoomValue
{
  if (!text)
  {
    return ''
  }

  if (!options.inferTypes)
  {
    return text
  }

  // null
  if (text === 'null' || text === 'nil')
  {
    return null
  }

  // Boolean
  if (text === 'true')
  {
    return true
  }

  if (text === 'false')
  {
    return false
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(text))
  {
    const num = Number(text)

    if (!isNaN(num))
    {
      return num
    }
  }

  // Inline array: comma-separated values
  if (text.includes(','))
  {
    return text.split(',').map(item => parseValue(item.trim(), options))
  }

  // String
  return text
}

/**
 * Get indentation level (number of leading spaces)
 */
function getIndent(line: string): number
{
  const match = line.match(/^(\s*)/)
  return match ? match[1].length : 0
}

/**
 * Find the end of a block (where indent returns to base level)
 */
function findBlockEnd(lines: string[], start: number, end: number, baseIndent: number): number
{
  for (let i = start; i < end; i++)
  {
    const line = lines[i]
    if (!line.trim()) continue // Skip empty lines

    const indent = getIndent(line)

    if (indent < baseIndent)
    {
      return i
    }
  }

  return end
}

/**
 * Parse Loom text with error handling
 * Throws on parse errors in strict mode
 */
export function parseStrict<T = LoomObject>(text: string, options: ParseOptions = {}): T
{
  const result = parse<T>(text, { ...options, strict: true })

  if (!result.success)
  {
    const errorMessages = result.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n')
    throw new Error(`Loom parse error:\n${errorMessages}`)
  }

  return result.data
}

