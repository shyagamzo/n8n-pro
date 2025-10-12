import { apiFetch } from '../api/fetch'
import { emitSystemInfo } from '../events/emitters'
import { DEFAULTS } from '../constants'

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
 * Cache for node types to avoid repeated API calls
 */
let nodeTypesCache: NodeTypesResponse | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch all available node types from n8n API
 */
export async function fetchNodeTypes(options: {
  baseUrl?: string
  apiKey?: string
  forceRefresh?: boolean
}): Promise<NodeTypesResponse>
{
  const now = Date.now()

  // Return cached data if available and not expired
  if (!options.forceRefresh && nodeTypesCache && (now - cacheTimestamp < CACHE_TTL_MS))
  {
    return nodeTypesCache
  }

  const baseUrl = (options.baseUrl ?? DEFAULTS.N8N_BASE_URL).replace(/\/$/, '')
  const authHeaders: Record<string, string> | undefined = options.apiKey
    ? {
        'X-N8N-API-KEY': options.apiKey,
        'Authorization': `Bearer ${options.apiKey}`
      }
    : undefined

  const url = `${baseUrl}/api/v1/node-types`

  try
  {
    const nodeTypes = await apiFetch<NodeTypesResponse>(url, {
      method: 'GET',
      headers: authHeaders,
      timeoutMs: 15_000,
    })

    // Cache the result
    nodeTypesCache = nodeTypes
    cacheTimestamp = now

    emitSystemInfo('node-types', 'Node types fetched from n8n API', { count: Object.keys(nodeTypes).length })
    return nodeTypes
  }
  catch (error)
  {
    // Deep validation requires node types API, which may not be available in all n8n versions
    // This is not a critical error - we fall back to structural validation
    emitSystemInfo('node-types', 'Node types API unavailable (deep validation disabled)', {
      endpoint: url,
      error: error instanceof Error ? error.message : String(error)
    })

    // If we have stale cache, return it as fallback
    if (nodeTypesCache)
    {
      emitSystemInfo('node-types', 'Using cached node types from previous fetch', {})
      return nodeTypesCache
    }

    // Re-throw to let caller handle gracefully
    throw error
  }
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
 * Clear the node types cache (useful for testing)
 */
export function clearNodeTypesCache(): void
{
  nodeTypesCache = null
  cacheTimestamp = 0
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

