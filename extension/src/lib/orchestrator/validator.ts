import { ChatOpenAI } from '@langchain/openai'
import { getAgentPrompt } from '../prompts'
import type { Plan } from '../types/plan'
import type { NodeTypesResponse } from '../n8n/node-types'
import { nodeTypeExists, getRequiredParameters, isTriggerNode } from '../n8n/node-types'

export type ValidationError = {
  severity: 'critical' | 'warning'
  category: 'node_type' | 'node_structure' | 'connection' | 'parameter' | 'credential' | 'format'
  nodeId?: string
  nodeName?: string
  field: string
  expected: string
  actual: string
  suggestion: string
  availableAlternatives?: string[]
}

export type ValidationResult = {
  valid: boolean
  errors?: ValidationError[]
  warnings?: ValidationError[]
  workflow?: Plan['workflow']
}

export type ValidatorInput = {
  apiKey: string
  plan: Plan
  nodeTypes: NodeTypesResponse
}

/**
 * Validate a workflow plan using the Validator Agent
 */
export async function validatePlan(input: ValidatorInput): Promise<ValidationResult>
{
  const { apiKey, plan, nodeTypes } = input

  // First, run structural validations (fast, no LLM)
  const structuralValidation = validateStructure(plan, nodeTypes)

  if (!structuralValidation.valid)
  {
    // If structural validation fails critically, don't bother with LLM
    return structuralValidation
  }

  // If structural validation passes, run LLM validation for deeper checks
  try
  {
    const llmValidation = await validateWithLLM(apiKey, plan, nodeTypes)
    return llmValidation
  }
  catch (error)
  {
    console.error('❌ LLM validation failed, falling back to structural validation:', error)
    // If LLM fails, return structural validation result
    return structuralValidation
  }
}

/**
 * Structural validation (no LLM, fast checks)
 */
function validateStructure(plan: Plan, nodeTypes: NodeTypesResponse): ValidationResult
{
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const workflow = plan.workflow

  if (!workflow)
  {
    return {
      valid: false,
      errors: [{
        severity: 'critical',
        category: 'format',
        field: 'workflow',
        expected: 'Workflow object with nodes and connections',
        actual: 'undefined',
        suggestion: 'Plan must include a workflow object'
      }]
    }
  }

  // Validate nodes exist
  if (!workflow.nodes || !Array.isArray(workflow.nodes))
  {
    return {
      valid: false,
      errors: [{
        severity: 'critical',
        category: 'format',
        field: 'workflow.nodes',
        expected: 'Array of nodes',
        actual: typeof workflow.nodes,
        suggestion: 'Workflow must have a nodes array'
      }]
    }
  }

  // Validate each node
  const nodeNames = new Set<string>()
  const nodeIds = new Set<string>()

  for (const node of workflow.nodes as Array<Record<string, unknown>>)
  {
    const nodeId = String(node.id || '')
    const nodeName = String(node.name || '')
    const nodeType = String(node.type || '')

    // Check required fields
    if (!node.id)
    {
      errors.push({
        severity: 'critical',
        category: 'node_structure',
        nodeId,
        nodeName,
        field: 'id',
        expected: 'Unique node identifier',
        actual: 'undefined',
        suggestion: 'Each node must have an "id" field'
      })
    }

    if (!node.name)
    {
      errors.push({
        severity: 'critical',
        category: 'node_structure',
        nodeId,
        nodeName,
        field: 'name',
        expected: 'Node display name',
        actual: 'undefined',
        suggestion: 'Each node must have a "name" field'
      })
    }

    if (!node.type)
    {
      errors.push({
        severity: 'critical',
        category: 'node_structure',
        nodeId,
        nodeName,
        field: 'type',
        expected: 'Valid n8n node type',
        actual: 'undefined',
        suggestion: 'Each node must have a "type" field'
      })
    }
    else
    {
      // Check if node type exists in n8n
      if (!nodeTypeExists(nodeTypes, nodeType))
      {
        // Find similar node types (fuzzy match)
        const similar = findSimilarNodeTypes(nodeTypes, nodeType)

        errors.push({
          severity: 'critical',
          category: 'node_type',
          nodeId,
          nodeName,
          field: 'type',
          expected: 'Valid n8n node type from available types',
          actual: nodeType,
          suggestion: similar.length > 0
            ? `Node type "${nodeType}" doesn't exist. Did you mean: ${similar.slice(0, 3).join(', ')}?`
            : `Node type "${nodeType}" doesn't exist in n8n.`,
          availableAlternatives: similar.slice(0, 5)
        })
      }
      else
      {
        // Check required parameters
        const requiredParams = getRequiredParameters(nodeTypes, nodeType)
        const nodeParams = (node.parameters as Record<string, unknown>) || {}

        for (const param of requiredParams)
        {
          if (!(param in nodeParams))
          {
            warnings.push({
              severity: 'warning',
              category: 'parameter',
              nodeId,
              nodeName,
              field: `parameters.${param}`,
              expected: `Required parameter "${param}"`,
              actual: 'undefined',
              suggestion: `Node type "${nodeType}" requires parameter "${param}"`
            })
          }
        }
      }
    }

    if (!node.parameters || typeof node.parameters !== 'object')
    {
      warnings.push({
        severity: 'warning',
        category: 'node_structure',
        nodeId,
        nodeName,
        field: 'parameters',
        expected: 'Object (can be empty {})',
        actual: typeof node.parameters,
        suggestion: 'Node should have a "parameters" object'
      })
    }

    if (!node.position || !Array.isArray(node.position) || (node.position as unknown[]).length !== 2)
    {
      warnings.push({
        severity: 'warning',
        category: 'node_structure',
        nodeId,
        nodeName,
        field: 'position',
        expected: 'Array of two numbers [x, y]',
        actual: Array.isArray(node.position) ? `Array(${(node.position as unknown[]).length})` : typeof node.position,
        suggestion: 'Node should have a "position" array with [x, y] coordinates'
      })
    }

    nodeNames.add(nodeName)
    nodeIds.add(nodeId)
  }

  // Validate connections
  if (workflow.connections && typeof workflow.connections === 'object')
  {
    const connections = workflow.connections as Record<string, unknown>

    for (const [sourceName, outputs] of Object.entries(connections))
    {
      // Check if source node exists
      if (!nodeNames.has(sourceName))
      {
        errors.push({
          severity: 'critical',
          category: 'connection',
          field: `connections.${sourceName}`,
          expected: 'Connection source must reference an existing node name',
          actual: sourceName,
          suggestion: `Node "${sourceName}" doesn't exist. Available nodes: ${Array.from(nodeNames).join(', ')}`
        })
        continue
      }

      if (!outputs || typeof outputs !== 'object') continue

      const outputsObj = outputs as Record<string, unknown>

      for (const [outputType, targetsList] of Object.entries(outputsObj))
      {
        if (!Array.isArray(targetsList)) continue

        // Check if it's double-nested
        const isDoubleNested = targetsList.length > 0 && Array.isArray(targetsList[0])
        const targets = isDoubleNested ? (targetsList[0] as unknown[]) : targetsList

        for (const target of targets)
        {
          if (typeof target !== 'object' || target === null) continue

          const targetObj = target as Record<string, unknown>
          const targetNode = String(targetObj.node || '')

          // Check if target node exists
          if (targetNode && !nodeNames.has(targetNode))
          {
            errors.push({
              severity: 'critical',
              category: 'connection',
              field: `connections.${sourceName}.${outputType}`,
              expected: 'Connection target must reference an existing node name',
              actual: targetNode,
              suggestion: `Target node "${targetNode}" doesn't exist. Available nodes: ${Array.from(nodeNames).join(', ')}`
            })
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    workflow: errors.length === 0 ? workflow : undefined
  }
}

/**
 * LLM-based validation for deeper semantic checks
 */
async function validateWithLLM(
  apiKey: string,
  plan: Plan,
  nodeTypes: NodeTypesResponse
): Promise<ValidationResult>
{
  const model = new ChatOpenAI({
    apiKey,
    modelName: 'gpt-4o-mini',
    temperature: 0,
  })

  const validatorPrompt = getAgentPrompt('validator')

  // Prepare node types list for the validator
  const availableNodeTypes = Object.keys(nodeTypes).sort()
  const nodeTypesMetadata = Object.entries(nodeTypes).reduce((acc, [typeName, nodeType]) => {
    acc[typeName] = {
      displayName: nodeType.displayName,
      description: nodeType.description,
      requiredParams: nodeType.properties.filter(p => p.required).map(p => p.name),
      isTrigger: isTriggerNode(nodeTypes, typeName)
    }
    return acc
  }, {} as Record<string, unknown>)

  const userMessage = `Validate this workflow plan:

**Available Node Types:** ${availableNodeTypes.length} types available
(Checking against actual n8n node types)

**Plan to Validate:**
\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

Return ONLY valid JSON with validation results (no markdown, no code blocks).`

  try
  {
    const response = await model.invoke([
      { role: 'system', content: validatorPrompt },
      {
        role: 'system',
        content: `Available node types: ${availableNodeTypes.join(', ')}\n\nNode types metadata:\n${JSON.stringify(nodeTypesMetadata, null, 2)}`
      },
      { role: 'user', content: userMessage }
    ])

    const content = response.content.toString().trim()

    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/^(\{[\s\S]*\})$/)
    const jsonStr = jsonMatch ? jsonMatch[1] : content

    const result = JSON.parse(jsonStr) as ValidationResult

    return result
  }
  catch (error)
  {
    console.error('Failed to parse validator LLM response:', error)
    throw error
  }
}

/**
 * Find similar node types using fuzzy matching
 */
function findSimilarNodeTypes(nodeTypes: NodeTypesResponse, target: string): string[]
{
  const allTypes = Object.keys(nodeTypes)
  const targetLower = target.toLowerCase()

  // Extract the node name part (after the last dot)
  const targetName = target.split('.').pop()?.toLowerCase() || targetLower

  // Score each node type
  const scored = allTypes.map(type => {
    const typeLower = type.toLowerCase()
    const typeName = type.split('.').pop()?.toLowerCase() || typeLower

    let score = 0

    // Exact match on name
    if (typeName === targetName) score += 100

    // Contains the target name
    if (typeName.includes(targetName)) score += 50

    // Contains words from target
    const targetWords = targetName.split(/[^a-z0-9]+/)
    const typeWords = typeName.split(/[^a-z0-9]+/)

    for (const word of targetWords)
    {
      if (word.length < 3) continue

      for (const typeWord of typeWords)
      {
        if (typeWord.includes(word) || word.includes(typeWord))
        {
          score += 20
        }
      }
    }

    // Full type contains target
    if (typeLower.includes(targetLower)) score += 30

    // Levenshtein distance bonus for close matches
    const distance = levenshteinDistance(targetName, typeName)
    if (distance <= 3) score += (10 - distance) * 10

    return { type, score }
  })

  // Return top matches with score > 0
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.type)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number
{
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++)
  {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++)
  {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++)
  {
    for (let j = 1; j <= a.length; j++)
    {
      if (b.charAt(i - 1) === a.charAt(j - 1))
      {
        matrix[i][j] = matrix[i - 1][j - 1]
      }
      else
      {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

