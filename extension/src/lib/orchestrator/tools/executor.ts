import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createN8nClient } from '../../n8n'
import { DEFAULTS } from '../../constants'

const createWorkflowSchema = z.object({
  workflow: z.any().describe('The workflow object to create (with nodes, connections, etc.)'),
  apiKey: z.string().describe('n8n API key for authentication'),
  baseUrl: z.string().default(DEFAULTS.N8N_BASE_URL).describe('n8n instance base URL')
})

/**
 * Tool for executor to create a workflow in n8n.
 * Returns the workflow ID and URL for user reference.
 */
export const createWorkflowTool = tool(
  async (input) => {
    const args = input as z.infer<typeof createWorkflowSchema>
    const n8n = createN8nClient({
      apiKey: args.apiKey,
      baseUrl: args.baseUrl
    })

    const workflow = await n8n.createWorkflow(args.workflow) as any

    return JSON.stringify({
      id: workflow.id,
      name: workflow.name || 'Unnamed Workflow',
      url: `${args.baseUrl}/workflow/${workflow.id}`,
      active: workflow.active || false
    })
  },
  {
    name: 'create_n8n_workflow',
    description: 'Create a new workflow in n8n. Returns the workflow ID, name, and URL. Use this after the workflow plan has been validated.',
    schema: createWorkflowSchema
  }
)

const checkCredentialsSchema = z.object({
  requiredTypes: z.array(z.string()).describe('Array of required credential types (e.g. ["slackApi", "googleSheetsOAuth2Api"])'),
  apiKey: z.string().describe('n8n API key for authentication'),
  baseUrl: z.string().default('http://localhost:5678').describe('n8n instance base URL')
})

/**
 * Tool for executor to check which credentials exist in n8n.
 * Identifies missing credentials without blocking workflow creation.
 */
export const checkCredentialsTool = tool(
  async (input) => {
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

/**
 * All tools available to the executor agent.
 */
export const executorTools = [createWorkflowTool, checkCredentialsTool]

