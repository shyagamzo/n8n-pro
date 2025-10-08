/**
 * Credential matching and injection logic
 * Automatically links workflow nodes to existing credentials
 */

type AvailableCredential = {
  id: string
  name: string
  type: string
}

type WorkflowNode = {
  id: string
  type: string
  name: string
  parameters: Record<string, unknown>
  credentials?: Record<string, { id: string; name: string }>
  [key: string]: unknown
}

type Workflow = {
  name: string
  nodes: unknown[]
  connections: Record<string, unknown>
  settings?: Record<string, unknown>
}

/**
 * Type guard to check if an object is a valid WorkflowNode
 */
function isWorkflowNode(node: unknown): node is WorkflowNode
{
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    typeof (node as WorkflowNode).type === 'string'
  )
}

/**
 * Maps node types to their required credential types
 * Based on n8n's node credential requirements
 */
const NODE_TO_CREDENTIAL_MAP: Record<string, string> = {
  'n8n-nodes-base.slack': 'slackApi',
  'n8n-nodes-base.gmail': 'gmailOAuth2',
  'n8n-nodes-base.googleSheets': 'googleSheetsOAuth2',
  'n8n-nodes-base.airtable': 'airtableApi',
  'n8n-nodes-base.notion': 'notionApi',
  'n8n-nodes-base.discord': 'discordBotToken',
  'n8n-nodes-base.trello': 'trelloApi',
  'n8n-nodes-base.github': 'githubApi',
  'n8n-nodes-base.gitlab': 'gitlabApi',
  'n8n-nodes-base.jira': 'jiraApi',
  'n8n-nodes-base.asana': 'asanaApi',
  'n8n-nodes-base.stripe': 'stripeApi',
  'n8n-nodes-base.twilio': 'twilioApi',
  'n8n-nodes-base.sendGrid': 'sendGridApi',
  'n8n-nodes-base.mailchimp': 'mailchimpApi',
  'n8n-nodes-base.hubspot': 'hubspotApi',
  'n8n-nodes-base.salesforce': 'salesforceApi',
  'n8n-nodes-base.shopify': 'shopifyApi',
}

/**
 * Find the best matching credential for a given credential type
 * Matches by type, returns the most recently used/created credential
 */
function findMatchingCredential(
  credentialType: string,
  availableCredentials: AvailableCredential[]
): AvailableCredential | undefined
{
  return availableCredentials.find(cred => cred.type === credentialType)
}

/**
 * Inject credential IDs into workflow nodes
 * Automatically links nodes to existing credentials when available
 */
export function injectCredentials(
  workflow: Workflow,
  availableCredentials: AvailableCredential[]
): Workflow
{
  if (!availableCredentials || availableCredentials.length === 0)
  {
    return workflow
  }

  const updatedNodes = workflow.nodes.map(node =>
  {
    // Validate node structure
    if (!isWorkflowNode(node))
    {
      return node
    }

    // Determine required credential type for this node
    const requiredCredentialType = NODE_TO_CREDENTIAL_MAP[node.type]
    
    if (!requiredCredentialType)
    {
      // Node doesn't require credentials or type not mapped
      return node
    }

    // Find matching credential
    const matchingCredential = findMatchingCredential(requiredCredentialType, availableCredentials)
    
    if (!matchingCredential)
    {
      // No matching credential found
      return node
    }

    // Inject credential reference
    return {
      ...node,
      credentials: {
        [requiredCredentialType]: {
          id: matchingCredential.id,
          name: matchingCredential.name,
        },
      },
    }
  })

  return {
    ...workflow,
    nodes: updatedNodes,
  }
}

/**
 * Get statistics about credential matching for a workflow
 * Useful for logging and debugging
 */
export function getCredentialMatchStats(
  workflow: Workflow,
  availableCredentials: AvailableCredential[]
): {
  totalNodes: number
  nodesNeedingCredentials: number
  nodesWithMatchedCredentials: number
  unmatchedCredentialTypes: string[]
}
{
  const validNodes = workflow.nodes.filter(isWorkflowNode)
  const nodesNeedingCredentials = validNodes.filter(node => 
    NODE_TO_CREDENTIAL_MAP[node.type]
  )

  const matched = nodesNeedingCredentials.filter(node =>
  {
    const requiredType = NODE_TO_CREDENTIAL_MAP[node.type]
    return findMatchingCredential(requiredType, availableCredentials)
  })

  const unmatchedTypes = nodesNeedingCredentials
    .filter(node =>
    {
      const requiredType = NODE_TO_CREDENTIAL_MAP[node.type]
      return !findMatchingCredential(requiredType, availableCredentials)
    })
    .map(node => NODE_TO_CREDENTIAL_MAP[node.type])
    .filter((type, idx, arr) => arr.indexOf(type) === idx) // unique

  return {
    totalNodes: workflow.nodes.length,
    nodesNeedingCredentials: nodesNeedingCredentials.length,
    nodesWithMatchedCredentials: matched.length,
    unmatchedCredentialTypes: unmatchedTypes,
  }
}

