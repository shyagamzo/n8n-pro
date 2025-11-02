// ==========================================
// Imports
// ==========================================

import { tool } from '@langchain/core/tools'
import { z } from 'zod'

import { N8nClient } from '@n8n'
import { WorkflowBuilder } from '@n8n/workflow-builder'
import type { ValidationError } from '@n8n/workflow-builder'
import { DEFAULTS } from '@shared/constants'
import { emitValidationError, emitWorkflowCreated } from '@events/emitters'

// ==========================================
// Tool Schemas
// ==========================================

const createWorkflowSchema = z.object({
  workflow: z.union([
    z.record(z.unknown()),
    z.string()
  ]).describe('The workflow object to create (with nodes, connections, etc.) - can be JSON string or object'),
  apiKey: z.string().describe('n8n API key for authentication'),
  baseUrl: z.string().default(DEFAULTS.N8N_BASE_URL).describe('n8n instance base URL')
})

const checkCredentialsSchema = z.object({
  requiredTypes: z.array(z.string()).describe('Array of required credential types (e.g. ["slackApi", "googleSheetsOAuth2Api"])'),
  apiKey: z.string().describe('n8n API key for authentication'),
  baseUrl: z.string().default(DEFAULTS.N8N_BASE_URL).describe('n8n instance base URL')
})

// ==========================================
// Create Workflow Tool
// ==========================================

/**
 * Create a workflow in n8n
 *
 * Returns workflow ID and URL for user reference.
 *
 * VALIDATION LAYER: This tool validates workflow structure before
 * submitting to n8n API to prevent malformed workflows that pass
 * API validation but fail in the UI.
 */
export const createWorkflowTool = tool(
  async (input) =>
{
    const args = input as z.infer<typeof createWorkflowSchema>

    // Parse workflow if it's a JSON string
    let workflowData: unknown
    try
    {
      workflowData = typeof args.workflow === 'string'
        ? JSON.parse(args.workflow)
        : args.workflow
    }
    catch (error)
    {
      return JSON.stringify({
        error: 'Invalid JSON',
        message: 'The workflow JSON string could not be parsed',
        details: error instanceof Error ? error.message : String(error)
      })
    }

    // VALIDATION LAYER: Validate and normalize workflow structure
    const buildResult = WorkflowBuilder.build(workflowData)

    if (!buildResult.success)
    {
      // Emit validation error event for logging/tracing
      emitValidationError(
        new Error(`Workflow validation failed: ${buildResult.errors.length} error(s)`),
        'executor-tool',
        {
          validationErrors: buildResult.errors,
          workflowName: typeof workflowData === 'object' && workflowData !== null && 'name' in workflowData
            ? workflowData.name
            : 'Unknown'
        }
      )

      // Return actionable error response to LLM agent
      return JSON.stringify({
        error: 'Workflow validation failed',
        validationErrors: buildResult.errors.map((err: ValidationError) => ({
          field: err.field,
          message: err.message,
          fix: err.fix
        })),
        suggestion: 'The workflow structure does not meet n8n requirements. Review the validation errors and regenerate the workflow plan with corrections.'
      })
    }

    // Workflow validated successfully - create in n8n
    const n8n = new N8nClient({
      apiKey: args.apiKey,
      baseUrl: args.baseUrl
    })

    const workflow = await n8n.createWorkflow(buildResult.workflow) as Record<string, unknown>

    // Emit success event for logging/tracing
    emitWorkflowCreated(buildResult.workflow, workflow.id as string)

    return JSON.stringify({
      id: workflow.id as string,
      name: (workflow.name as string) || 'Unnamed Workflow',
      url: `${args.baseUrl}/workflow/${workflow.id}`,
      active: (workflow.active as boolean) || false
    })
  },
  {
    name: 'create_n8n_workflow',
    description: 'Create a new workflow in n8n. Returns the workflow ID, name, and URL. Use this after the workflow plan has been validated. The tool performs structural validation before submitting to n8n.',
    schema: createWorkflowSchema
  }
)

// ==========================================
// Check Credentials Tool
// ==========================================

/**
 * Check which credentials exist in n8n
 *
 * Identifies missing credentials without blocking workflow creation.
 * TODO: Implement actual credential checking via n8n API.
 */
export const checkCredentialsTool = tool(
  async (input) => 
{
    const args = input as z.infer<typeof checkCredentialsSchema>

    try
    {
      // TODO: Implement listCredentials in n8n client
      // For now, return placeholder indicating credentials need to be checked manually
      return JSON.stringify({
        available: [],
        missing: args.requiredTypes,
        note: 'Credential checking not yet implemented. Please verify credentials manually.',
        setupLinks: args.requiredTypes.map((type: string) => ({
          type,
          url: `${args.baseUrl}/credentials/new/${type}`
        }))
      })
    }
    catch (error)
    {
      // If credential check fails, don't block - just report it
      return JSON.stringify({
        available: [],
        missing: args.requiredTypes,
        error: 'Could not check credentials',
        setupLinks: args.requiredTypes.map((type: string) => ({
          type,
          url: `${args.baseUrl}/credentials/new/${type}`
        }))
      })
    }
  },
  {
    name: 'check_credentials',
    description: 'Check which credentials exist in n8n and which are missing. Returns available credentials and setup links for missing ones. This is informational - workflow creation can proceed even with missing credentials.',
    schema: checkCredentialsSchema
  }
)

// ==========================================
// Tool Exports
// ==========================================

/**
 * All tools available to the executor agent
 */
export const executorTools = [createWorkflowTool, checkCredentialsTool]

