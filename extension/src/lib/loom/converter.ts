import type { Plan } from '../types/plan'

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

  return {
    title,
    summary,
    credentialsNeeded: credentialsNeededArray,
    credentialsAvailable: credentialsAvailableArray.length > 0 ? credentialsAvailableArray : undefined,
    workflow: {
      name: String(workflow.name || title),
      nodes: (workflow.nodes as unknown[]) || [],
      connections: (workflow.connections as Record<string, unknown>) || {},
    },
  }
}

