import { emitSystemInfo, emitSystemError } from '@events/emitters'
import { getHardcodedNodeTypes, getNodeTypeCount } from './hardcoded-node-types'
import { N8nInternalClient } from './internal-client'
import type { NodeTypeInfo } from './internal-client'

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
 * Strategy:
 * 1. Try fetching from n8n internal REST endpoint (/rest/node-types or similar)
 * 2. Fall back to hardcoded types from source code (517 nodes)
 *
 * @param options - Fetch options
 * @param options.baseUrl - n8n instance URL
 * @param options.forceRefresh - Skip cache and fetch fresh data
 * @param options.tryInternal - Try internal REST endpoint first (default: true, content scripts only)
 * @returns Node types dictionary
 */
export async function fetchNodeTypes(options?: {
  baseUrl?: string
  apiKey?: string
  forceRefresh?: boolean
  tryInternal?: boolean
}): Promise<NodeTypesResponse>
{
  // Return cached if available and not forcing refresh
  if (cachedNodeTypes && !options?.forceRefresh)
  {
    emitSystemInfo('node-types', 'Using cached node types', { count: Object.keys(cachedNodeTypes).length })
    return cachedNodeTypes
  }

  // Try internal REST endpoint if enabled (content scripts only)
  if (options?.tryInternal !== false)
  {
    try
    {
      const client = new N8nInternalClient({ baseUrl: options?.baseUrl })
      const internalNodes = await client.getNodeTypes()
      
      if (internalNodes && internalNodes.length > 0)
      {
        // Convert internal format to our format
        const converted = convertInternalNodesToTypes(internalNodes)
        cachedNodeTypes = converted
        
        emitSystemInfo('node-types', 'Fetched node types from n8n internal REST API', { 
          count: Object.keys(converted).length,
          source: 'internal-rest'
        })
        
        return converted
      }
    }
    catch (error)
    {
      emitSystemError(
        error instanceof Error ? error : new Error(String(error)),
        'node-types'
      )
    }
  }

  // Fall back to hardcoded types
  const nodeTypes = getHardcodedNodeTypes()
  const count = getNodeTypeCount()
  cachedNodeTypes = nodeTypes

  emitSystemInfo('node-types', 'Using hardcoded node types from source code', { 
    count,
    source: 'hardcoded'
  })

  return nodeTypes
}

/**
 * Convert internal REST node format to our NodeType format
 */
function convertInternalNodesToTypes(internalNodes: NodeTypeInfo[]): NodeTypesResponse
{
  const result: NodeTypesResponse = {}

  for (const node of internalNodes)
  {
    result[node.name] = {
      name: node.name,
      displayName: node.displayName,
      description: node.description,
      version: node.version,
      defaults: { name: node.displayName },
      inputs: node.inputs,
      outputs: node.outputs,
      properties: (node.properties as any) || [],
      group: node.group
    }
  }

  return result
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

