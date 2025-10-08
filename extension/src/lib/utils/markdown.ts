/**
 * Utilities for working with markdown-formatted text
 */

/**
 * Strip markdown code fences from text
 * Removes opening fence (e.g., ```loom, ```yaml, ```) and closing fence (```)
 */
export function stripCodeFences(text: string): string
{
  let cleaned = text.trim()

  // Remove opening code fence (``` or ```loom or ```yaml etc)
  if (cleaned.startsWith('```'))
  {
    const firstNewline = cleaned.indexOf('\n')

    if (firstNewline !== -1)
    {
      cleaned = cleaned.substring(firstNewline + 1)
    }
  }

  // Remove closing code fence
  if (cleaned.endsWith('```'))
  {
    const lastCodeFence = cleaned.lastIndexOf('```')
    cleaned = cleaned.substring(0, lastCodeFence)
  }

  return cleaned.trim()
}
