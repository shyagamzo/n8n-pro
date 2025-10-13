// ==========================================
// Imports
// ==========================================

import { tool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Command tools for enrichment agent to signal system state changes.
 *
 * These tools allow the LLM to communicate metadata without affecting user-facing content.
 * They don't execute actions - orchestrator reads tool call arguments from messages.
 */

// ==========================================
// Tool Schemas
// ==========================================

const reportRequirementsStatusSchema = z.object({
  hasAllRequiredInfo: z.boolean().describe('Whether you have gathered all the required information'),
  confidence: z.number().min(0).max(1).describe('Confidence level (0-1) in your assessment'),
  missingInfo: z.array(z.string()).optional().describe('List of missing information if hasAllRequiredInfo is false')
})

const setConfidenceSchema = z.object({
  confidence: z.number().min(0).max(1).describe('Confidence level in current understanding'),
  reasoning: z.string().optional().describe('Brief explanation of confidence level')
})

// ==========================================
// Report Requirements Status Tool
// ==========================================

export const reportRequirementsStatusTool = tool(
  // This tool doesn't execute anything - orchestrator reads args directly from message
  async () => 'Status reported',
  {
    name: 'reportRequirementsStatus',
    description: 'Report whether you have gathered enough information to proceed. Use this to communicate your assessment of the current conversation state.',
    schema: reportRequirementsStatusSchema
  }
)

// ==========================================
// Set Confidence Tool
// ==========================================

export const setConfidenceTool = tool(
  // This tool doesn't execute anything - orchestrator reads args directly from message
  async () => 'Confidence set',
  {
    name: 'setConfidence',
    description: 'Set your confidence level in understanding the user requirements. Use this to communicate how certain you are about the current requirements.',
    schema: setConfidenceSchema
  }
)

// ==========================================
// Tool Exports
// ==========================================

/**
 * All command tools available to the enrichment agent
 */
export const enrichmentCommandTools = [reportRequirementsStatusTool, setConfidenceTool]
