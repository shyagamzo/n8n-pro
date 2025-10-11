import { tool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Command tools for enrichment agent to signal system state changes.
 * These tools allow the LLM to communicate metadata without affecting user-facing content.
 */

const reportRequirementsStatusSchema = z.object({
  hasAllRequiredInfo: z.boolean().describe('Whether you have gathered all the required information'),
  confidence: z.number().min(0).max(1).describe('Confidence level (0-1) in your assessment'),
  missingInfo: z.array(z.string()).optional().describe('List of missing information if hasAllRequiredInfo is false')
})

export const reportRequirementsStatusTool = tool(
  async (input) => {
    const args = input as z.infer<typeof reportRequirementsStatusSchema>
    // This tool doesn't perform an action directly, it reports agent status
    // The orchestrator uses this information to make routing decisions
    return `Requirements status: ${args.hasAllRequiredInfo ? 'Complete' : 'Incomplete'} (confidence: ${args.confidence})`
  },
  {
    name: 'reportRequirementsStatus',
    description: 'Report whether you have gathered enough information to proceed. Use this to communicate your assessment of the current conversation state.',
    schema: reportRequirementsStatusSchema
  }
)

const setConfidenceSchema = z.object({
  confidence: z.number().min(0).max(1).describe('Confidence level in current understanding'),
  reasoning: z.string().optional().describe('Brief explanation of confidence level')
})

export const setConfidenceTool = tool(
  async (input) => {
    const args = input as z.infer<typeof setConfidenceSchema>
    return `Confidence set to ${args.confidence}: ${args.reasoning || 'No reasoning provided'}`
  },
  {
    name: 'setConfidence',
    description: 'Set your confidence level in understanding the user requirements. Use this to communicate how certain you are about the current requirements.',
    schema: setConfidenceSchema
  }
)

export const enrichmentCommandTools = [reportRequirementsStatusTool, setConfidenceTool]
