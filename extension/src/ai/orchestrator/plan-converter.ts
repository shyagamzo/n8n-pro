import type { Plan } from '@shared/types/plan'
import type { WorkflowNode, WorkflowConnections } from '@n8n/types'

/**
 * Convert parsed Loom data to Plan type
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

  // Convert nodes to properly typed WorkflowNode array
  const nodes: WorkflowNode[] = nodesRaw.map(node =>
  {
    const n = node as Record<string, unknown>
    return {
      id: n.id ? String(n.id) : undefined,
      name: String(n.name || 'Unnamed Node'),
      type: String(n.type || 'n8n-nodes-base.unknown'),
      parameters: (n.parameters as Record<string, unknown>) || {},
      position: Array.isArray(n.position) && n.position.length === 2
        ? [Number(n.position[0]), Number(n.position[1])] as [number, number]
        : undefined,
      credentials: (n.credentials as Record<string, { id: string; name?: string }>) || undefined,
    }
  })

  return {
    title,
    summary,
    credentialsNeeded: credentialsNeededArray,
    credentialsAvailable: credentialsAvailableArray.length > 0 ? credentialsAvailableArray : undefined,
    workflow: {
      name: String(workflow.name || title),
      nodes,
      connections: (workflow.connections as WorkflowConnections) || {},
    },
  }
}

