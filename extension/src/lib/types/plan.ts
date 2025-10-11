import type { WorkflowNode, WorkflowConnections } from '../n8n/types'

export type CredentialRef = {
  type: string
  name?: string
  requiredFor?: string
  nodeId?: string  // ID of the node that needs this credential
  nodeName?: string  // Display name of the node
}

export type PlanWorkflow = {
  name: string
  nodes: WorkflowNode[]
  connections: WorkflowConnections
  settings?: {
    saveDataErrorExecution?: string
    saveDataSuccessExecution?: string
    saveManualExecutions?: boolean
    executionTimeout?: number
    timezone?: string
  }
}

export type Plan = {
  title: string
  summary: string
  credentialsNeeded: CredentialRef[]
  credentialsAvailable?: CredentialRef[]
  workflow: PlanWorkflow
}


