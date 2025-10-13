// ==========================================
// Imports
// ==========================================

import { tool } from '@langchain/core/tools'
import { z } from 'zod'

import { fetchNodeTypes } from '@n8n/node-types'
import { DEFAULTS } from '@shared/constants'

// ==========================================
// Tool Schemas
// ==========================================

const fetchNodeTypesSchema = z.object({
  baseUrl: z.string().default(DEFAULTS.N8N_BASE_URL).describe('n8n base URL')
})

const getNodeDocsSchema = z.object({
  nodeType: z.string().describe('The node type, e.g. "n8n-nodes-base.slack"')
})

// ==========================================
// Fetch Node Types Tool
// ==========================================

/**
 * Fetch available n8n node types
 *
 * Helps planner/validator understand what nodes are available.
 */
export const fetchNodeTypesTool = tool(
  async (input) => {
    const args = input as z.infer<typeof fetchNodeTypesSchema>
    const nodeTypes = await fetchNodeTypes({
      baseUrl: args.baseUrl
    })

    // Return simplified list of node types with basic info
    const simplified = Array.isArray(nodeTypes) ? nodeTypes.map((nt) => ({
      name: nt.name,
      displayName: nt.displayName,
      description: nt.description,
      group: nt.group
    })) : []

    return JSON.stringify(simplified, null, 2)
  },
  {
    name: 'fetch_n8n_node_types',
    description: 'Get list of available n8n node types with their names and descriptions. Use this when you need to know what nodes are available in n8n for workflow design.',
    schema: fetchNodeTypesSchema
  }
)

// ==========================================
// Get Node Docs Tool
// ==========================================

/**
 * Get detailed documentation for a specific node type
 *
 * Provides parameter information and usage examples.
 * TODO: Implement actual documentation fetching.
 */
export const getNodeDocsTool = tool(
  async (input) => {
    const args = input as z.infer<typeof getNodeDocsSchema>
    // For now, return a placeholder
    // In the future, this could fetch from n8n API or use built-in documentation
    return JSON.stringify({
      nodeType: args.nodeType,
      documentation: 'Detailed documentation not yet implemented. Use node type reference in system prompt.',
      parameters: [],
      examples: []
    })
  },
  {
    name: 'get_node_docs',
    description: 'Get detailed documentation for a specific n8n node type including parameters and examples. Use this when you need specific details about how to configure a node.',
    schema: getNodeDocsSchema
  }
)

// ==========================================
// Tool Exports
// ==========================================

/**
 * All tools available to the planner agent
 */
export const plannerTools = [fetchNodeTypesTool, getNodeDocsTool]

