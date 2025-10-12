import { emitSystemInfo } from '../events/emitters'
import { getHardcodedNodeTypes, getNodeTypeCount } from './hardcoded-node-types'

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

/**
 * Fetch all available node types.
 *
 * Since n8n doesn't provide a public node-types API endpoint,
 * we return hardcoded node types based on n8n's source code and documentation.
 *
 * @param _options - Options (unused, kept for API compatibility)
 * @returns Hardcoded node types
 */
export async function fetchNodeTypes(_options?: {
  baseUrl?: string
  apiKey?: string
  forceRefresh?: boolean
}): Promise<NodeTypesResponse>
{
  const nodeTypes = getHardcodedNodeTypes()
  const count = getNodeTypeCount()

  emitSystemInfo('node-types', 'Using hardcoded node types (n8n has no public API endpoint)', { count })

  // Return as promise for API compatibility
  return Promise.resolve(nodeTypes)
}

/**
 * Check if a node type exists in n8n
 */
export function nodeTypeExists(nodeTypes: NodeTypesResponse, nodeType: string): boolean
{
  return nodeType in nodeTypes
}

/**
 * Get required parameters for a node type
 */
export function getRequiredParameters(nodeTypes: NodeTypesResponse, nodeType: string): string[]
{
  const node = nodeTypes[nodeType]
  if (!node) return []

  return node.properties
    .filter(p => p.required === true)
    .map(p => p.name)
}

/**
 * Get all parameter names for a node type
 */
export function getAllParameters(nodeTypes: NodeTypesResponse, nodeType: string): string[]
{
  const node = nodeTypes[nodeType]
  if (!node) return []

  return node.properties.map(p => p.name)
}

/**
 * Get credential requirements for a node type
 */
export function getCredentialTypes(nodeTypes: NodeTypesResponse, nodeType: string): string[]
{
  const node = nodeTypes[nodeType]
  if (!node?.credentials) return []

  return node.credentials.map(c => c.name)
}

/**
 * Clear the node types cache (no-op for hardcoded types, kept for API compatibility)
 */
export function clearNodeTypesCache(): void
{
  // No-op: hardcoded types don't need cache clearing
}

/**
 * Get display name for a node type
 */
export function getNodeDisplayName(nodeTypes: NodeTypesResponse, nodeType: string): string | undefined
{
  return nodeTypes[nodeType]?.displayName
}

/**
 * Check if a node type is a trigger
 */
export function isTriggerNode(nodeTypes: NodeTypesResponse, nodeType: string): boolean
{
  const node = nodeTypes[nodeType]
  if (!node) return false

  // Trigger nodes typically have no inputs
  return node.inputs.length === 0 || node.group?.includes('trigger') === true
}

/**
 * Get a summary of available node types grouped by category
 */
export function getNodeTypesSummary(nodeTypes: NodeTypesResponse): {
  total: number
  triggers: string[]
  actions: string[]
  categories: Record<string, string[]>
}
{
  const triggers: string[] = []
  const actions: string[] = []
  const categories: Record<string, string[]> = {}

  for (const [typeName, nodeType] of Object.entries(nodeTypes))
  {
    // Categorize as trigger or action
    if (isTriggerNode(nodeTypes, typeName))
    {
      triggers.push(typeName)
    }
    else
    {
      actions.push(typeName)
    }

    // Group by category
    const nodeCategories = nodeType.codex?.categories || nodeType.group || ['Other']

    for (const category of nodeCategories)
    {
      if (!categories[category])
      {
        categories[category] = []
      }

      categories[category].push(typeName)
    }
  }

  return {
    total: Object.keys(nodeTypes).length,
    triggers,
    actions,
    categories
  }
}

