/**
 * Type definitions for n8n node types
 *
 * Extracted to prevent circular dependencies between:
 * - hardcoded-node-types.ts (data)
 * - node-types.ts (functions)
 */

export type NodeParameter = {
  displayName: string
  name: string
  type: string
  required?: boolean
  default?: unknown
  description?: string
  options?: unknown[]
}

export type NodeType = {
  name: string
  displayName: string
  description: string
  version: number
  defaults: {
    name: string
    color?: string
  }
  inputs: string[]
  outputs: string[]
  properties: NodeParameter[]
  credentials?: Array<{
    name: string
    required?: boolean
  }>
  group?: string[]
  codex?: {
    categories?: string[]
  }
}

export type NodeTypesResponse = {
  [key: string]: NodeType
}
