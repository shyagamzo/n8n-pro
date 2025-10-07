export type CredentialRef = {
  type: string
  name?: string
}

export type Plan = {
  title: string
  summary: string
  credentialsNeeded: CredentialRef[]
  workflow: {
    name: string
    nodes: unknown[]
    connections: Record<string, unknown>
  }
}


