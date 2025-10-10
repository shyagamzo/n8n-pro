import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { n8n } from '../../n8n'

/**
 * Tool for executor to create a workflow in n8n.
 * Returns the workflow ID and URL for user reference.
 */
export const createWorkflowTool = tool(
  async (args) => {
    const workflow = await n8n.createWorkflow(args.workflow, {
      apiKey: args.apiKey,
      baseUrl: args.baseUrl
    })

    return JSON.stringify({
      id: workflow.id,
      name: workflow.name,
      url: `${args.baseUrl}/workflow/${workflow.id}`,
      active: workflow.active || false
    })
  },
  {
    name: 'create_n8n_workflow',
    description: 'Create a new workflow in n8n. Returns the workflow ID, name, and URL. Use this after the workflow plan has been validated.',
    schema: z.object({
      workflow: z.any().describe('The workflow object to create (with nodes, connections, etc.)'),
      apiKey: z.string().describe('n8n API key for authentication'),
      baseUrl: z.string().default('http://localhost:5678').describe('n8n instance base URL')
    })
  }
)

/**
 * Tool for executor to check which credentials exist in n8n.
 * Identifies missing credentials without blocking workflow creation.
 */
export const checkCredentialsTool = tool(
  async (args) => {
    try
    {
      const credentials = await n8n.listCredentials({
        apiKey: args.apiKey,
        baseUrl: args.baseUrl
      })

      // Check which required credentials are available
      const credentialMap = new Map(credentials.map(c => [c.type, c]))

      const available = args.requiredTypes
        .filter(type => credentialMap.has(type))
        .map(type => {
          const cred = credentialMap.get(type)!
          return { name: cred.name, type: cred.type, id: cred.id }
        })

      const missing = args.requiredTypes
        .filter(type => !credentialMap.has(type))

      return JSON.stringify({
        available,
        missing,
        setupLinks: missing.map(type => ({
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
        setupLinks: args.requiredTypes.map(type => ({
          type,
          url: `${args.baseUrl}/credentials/new/${type}`
        }))
      })
    }
  },
  {
    name: 'check_credentials',
    description: 'Check which credentials exist in n8n and which are missing. Returns available credentials and setup links for missing ones. This is informational - workflow creation can proceed even with missing credentials.',
    schema: z.object({
      requiredTypes: z.array(z.string()).describe('Array of required credential types (e.g. ["slackApi", "googleSheetsOAuth2Api"])'),
      apiKey: z.string().describe('n8n API key for authentication'),
      baseUrl: z.string().default('http://localhost:5678').describe('n8n instance base URL')
    })
  }
)

/**
 * All tools available to the executor agent.
 */
export const executorTools = [createWorkflowTool, checkCredentialsTool]

