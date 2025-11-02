import type { Plan } from '@shared/types/plan'
import type { N8nNode, N8nConnections, Position } from '@n8n/types'
import { isPosition, isN8nConnections } from '@n8n/types'
import { v4 as uuid } from 'uuid'

/**
 * Convert parsed Loom data to Plan type
 *
 * This function safely parses unknown Loom data into a type-safe Plan structure,
 * using strict type guards to validate n8n workflow components.
 */
export function loomToPlan(loomData: Record<string, unknown>): Plan
{
  const title = String(loomData.title || 'Workflow')
  const summary = String(loomData.summary || 'Generated workflow')

  const credentialsNeededRaw = loomData.credentialsNeeded
  const credentialsNeeded = Array.isArray(credentialsNeededRaw) ? credentialsNeededRaw : []

  const credentialsNeededArray = credentialsNeeded.map(cred =>
  {
    const c = cred as Record<string, unknown>
    return {
      type: String(c.type || ''),
      name: c.name ? String(c.name) : undefined,
      requiredFor: c.requiredFor ? String(c.requiredFor) : undefined,
      nodeId: c.nodeId ? String(c.nodeId) : undefined,
      nodeName: c.nodeName ? String(c.nodeName) : undefined,
    }
  })

  const credentialsAvailableRaw = loomData.credentialsAvailable
  const credentialsAvailable = Array.isArray(credentialsAvailableRaw) ? credentialsAvailableRaw : []

  const credentialsAvailableArray = credentialsAvailable.map(cred =>
  {
    const c = cred as Record<string, unknown>
    return {
      type: String(c.type || ''),
      name: c.name ? String(c.name) : undefined,
      requiredFor: c.status ? String(c.status) : undefined,
    }
  })

  const workflow = loomData.workflow as Record<string, unknown> || {}
  const nodesRaw = Array.isArray(workflow.nodes) ? workflow.nodes : []

  // Convert nodes to properly typed N8nNode array with strict validation
  const nodes: N8nNode[] = nodesRaw.map(node =>
  {
    const n = node as Record<string, unknown>

    // Parse position with type guard validation
    let position: Position = [0, 0]
    if (isPosition(n.position))
    {
      position = n.position
    }
    else if (Array.isArray(n.position) && n.position.length === 2)
    {
      position = [Number(n.position[0]), Number(n.position[1])]
    }

    // Parse credentials with proper typing
    let credentials = undefined
    if (n.credentials && typeof n.credentials === 'object')
    {
      credentials = n.credentials as Record<string, { id: string; name?: string }>
    }

    return {
      id: n.id ? String(n.id) : uuid(),
      name: String(n.name || 'Unnamed Node'),
      type: String(n.type || 'n8n-nodes-base.unknown'),
      typeVersion: typeof n.typeVersion === 'number' ? n.typeVersion : 1,
      position,
      parameters: (n.parameters && typeof n.parameters === 'object' ? n.parameters : {}) as Record<string, unknown>,
      credentials,
    }
  })

  // Parse connections with type guard validation
  let connections: N8nConnections = {}
  if (isN8nConnections(workflow.connections))
  {
    connections = workflow.connections
  }
  else if (workflow.connections && typeof workflow.connections === 'object')
  {
    // Fallback: assume it's connections but type guard failed
    connections = workflow.connections as N8nConnections
  }

  return {
    title,
    summary,
    credentialsNeeded: credentialsNeededArray,
    credentialsAvailable: credentialsAvailableArray.length > 0 ? credentialsAvailableArray : undefined,
    workflow: {
      name: String(workflow.name || title),
      nodes,
      connections,
    },
  }
}

