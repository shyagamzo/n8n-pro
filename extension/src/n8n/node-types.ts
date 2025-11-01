import { emitSystemInfo } from '@events/emitters'
import { HARDCODED_NODE_TYPES } from './hardcoded-node-types'

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

// Cache for fetched node types
let cachedNodeTypes: NodeTypesResponse | null = null

/**
 * Fetch all available node types.
 *
 * Returns hardcoded node types extracted from n8n source code.
 * This includes all built-in nodes from n8n-nodes-base package.
 *
 * Note: This function simulates an async API call for compatibility,
 * but actually returns pre-extracted hardcoded data.
 *
 * @param options - Fetch options
 * @param options.baseUrl - Ignored (for API compatibility)
 * @param options.forceRefresh - Skip cache and return fresh copy
 * @returns Node types dictionary
 */
export async function fetchNodeTypes(options?: {
  baseUrl?: string
  forceRefresh?: boolean
}): Promise<NodeTypesResponse>
{
  // Return cached if available and not forcing refresh
  if (cachedNodeTypes && !options?.forceRefresh)
  {
    emitSystemInfo('node-types', 'Using cached node types', { count: Object.keys(cachedNodeTypes).length })
    return cachedNodeTypes
  }

  // Simulate async API call delay
  await new Promise(resolve => setTimeout(resolve, 10))

  // Cache the hardcoded node types
  cachedNodeTypes = { ...HARDCODED_NODE_TYPES }

  emitSystemInfo('node-types', 'Loaded hardcoded node types', {
    count: Object.keys(cachedNodeTypes).length,
    source: 'hardcoded'
  })

  return cachedNodeTypes
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
 * Clear the node types cache
 */
export function clearNodeTypesCache(): void
{
  cachedNodeTypes = null
  emitSystemInfo('node-types', 'Node types cache cleared', {})
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

