export type CredentialRef = {
  type: string
  name?: string
  requiredFor?: string
  nodeId?: string  // ID of the node that needs this credential
  nodeName?: string  // Display name of the node
}

export type Plan = {
  title: string
  summary: string
  credentialsNeeded: CredentialRef[]
  credentialsAvailable?: CredentialRef[]
  workflow: {
    name: string
    nodes: unknown[]
    connections: Record<string, unknown>
    settings?: Record<string, unknown>
  }
}


