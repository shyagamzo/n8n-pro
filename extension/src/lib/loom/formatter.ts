/**
 * Loom Protocol - Formatter
 *
 * Converts JavaScript objects to Loom text format.
 */

import type { LoomValue, LoomObject, FormatOptions } from './types'

const DEFAULT_OPTIONS: Required<FormatOptions> = {
  indent: 2,
  includeComments: false,
  sortKeys: false,
}

/**
 * Format JavaScript object into Loom text
 *
 * @example
 * ```ts
 * const obj = {
 *   title: "Daily Report",
 *   enabled: true,
 *   count: 42,
 *   tags: ["urgent", "daily"]
 * };
 * const text = format(obj);
 * // text = "title: Daily Report\nenabled: true\ncount: 42\ntags:\n  - urgent\n  - daily"
 * ```
 */
export function format(value: LoomValue, options: FormatOptions = {}): string
{
  const opts = { ...DEFAULT_OPTIONS, ...options }
  return formatValue(value, 0, opts).trim()
}

/**
 * Format a value at a given indent level
 */
function formatValue(value: LoomValue, level: number, options: Required<FormatOptions>): string
{
  if (value === null)
  {
    return 'null'
  }

  if (typeof value === 'boolean')
  {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'number')
  {
    return String(value)
  }

  if (typeof value === 'string')
  {
    return value
  }

  if (Array.isArray(value))
  {
    return formatArray(value, level, options)
  }

  if (typeof value === 'object')
  {
    return formatObject(value as LoomObject, level, options)
  }

  return ''
}

/**
 * Format an object
 */
function formatObject(obj: LoomObject, level: number, options: Required<FormatOptions>): string
{
  const indent = ' '.repeat(level * options.indent)
  const lines: string[] = []
  
  let keys = Object.keys(obj)
  if (options.sortKeys)
  {
    keys = keys.sort()
  }
  
  for (const key of keys)
  {
    const value = obj[key]
    
    if (value === null)
    {
      lines.push(`${indent}${key}: null`)
    }
    else if (typeof value === 'boolean')
    {
      lines.push(`${indent}${key}: ${value ? 'true' : 'false'}`)
    }
    else if (typeof value === 'number')
    {
      lines.push(`${indent}${key}: ${value}`)
    }
    else if (typeof value === 'string')
    {
      lines.push(`${indent}${key}: ${value}`)
    }
    else if (Array.isArray(value))
    {
      // Check if it's a simple array (all primitives)
      const isSimpleArray = value.every(item => 
        typeof item === 'string' || 
        typeof item === 'number' || 
        typeof item === 'boolean' ||
        item === null
      )
      
      if (isSimpleArray && value.length <= 5)
      {
        // Inline format for short simple arrays - more compact
        const items = value.map(item => String(item)).join(',')
        lines.push(`${indent}${key}: ${items}`)
      }
      else
      {
        // Multi-line format
        lines.push(`${indent}${key}:`)
        lines.push(formatArray(value, level + 1, options))
      }
    }
    else if (typeof value === 'object')
    {
      lines.push(`${indent}${key}:`)
      lines.push(formatObject(value as LoomObject, level + 1, options))
    }
  }
  
  return lines.join('\n')
}

/**
 * Format an array
 */
function formatArray(arr: LoomValue[], level: number, options: Required<FormatOptions>): string
{
  const indent = ' '.repeat(level * options.indent)
  const lines: string[] = []

  for (const item of arr)
  {
    if (item === null)
    {
      lines.push(`${indent}- null`)
    }
    else if (typeof item === 'boolean')
    {
      lines.push(`${indent}- ${item ? 'true' : 'false'}`)
    }
    else if (typeof item === 'number')
    {
      lines.push(`${indent}- ${item}`)
    }
    else if (typeof item === 'string')
    {
      lines.push(`${indent}- ${item}`)
    }
    else if (Array.isArray(item))
    {
      lines.push(`${indent}-`)
      lines.push(formatArray(item, level + 1, options))
    }
    else if (typeof item === 'object')
    {
      lines.push(`${indent}-`)
      lines.push(formatObject(item as LoomObject, level + 1, options))
    }
  }

  return lines.join('\n')
}

/**
 * Format with compact mode - tries to minimize lines
 */
export function formatCompact(value: LoomValue): string
{
  return format(value, { indent: 2, sortKeys: false, includeComments: false })
}

/**
 * Format with pretty mode - more readable
 */
export function formatPretty(value: LoomValue): string
{
  return format(value, { indent: 2, sortKeys: true, includeComments: false })
}

