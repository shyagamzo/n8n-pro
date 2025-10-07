export type CredentialRef = {
  type: string
  name?: string
  requiredFor?: string
}

export type Plan = {
  title: string
  summary: string
  credentialsNeeded: CredentialRef[]
  workflow: {
    name: string
    nodes: unknown[]
    connections: Record<string, unknown>
    settings?: Record<string, unknown>
  }
}


