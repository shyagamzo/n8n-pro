/**
 * Theme utilities for extracting n8n design tokens
 */

/**
 * Get n8n primary color from CSS variables
 */
export function getPrimaryColor(): string 
{
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary')
    .trim() || '#ff6d5a'
}

/**
 * Get n8n primary shade color from CSS variables
 */
export function getPrimaryShade(): string 
{
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary-shade')
    .trim() || '#e55a47'
}

