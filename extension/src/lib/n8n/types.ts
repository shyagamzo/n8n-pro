export type WorkflowSummary = {
  id: string
  name: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

export type WorkflowNode = {
  id?: string
  name: string
  type: string
  parameters?: Record<string, unknown>
  position?: [number, number]
  credentials?: Record<string, { id: string; name?: string }>
}

export type WorkflowConnections = Record<string, {
  main?: Array<Array<{
    node: string
    type: string
    index: number
  }>>
}>

export type Workflow = {
  id?: string
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
  active?: boolean
  createdAt?: string
  updatedAt?: string
  tags?: Array<{ id: string; name: string }>
}
