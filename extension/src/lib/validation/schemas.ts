import { z } from 'zod'

/**
 * Zod schemas for runtime validation of n8n API responses and internal types
 */

// n8n API Response Schemas
export const WorkflowSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  parameters: z.record(z.unknown()),
  position: z.tuple([z.number(), z.number()]),
  credentials: z.record(z.string()).optional(),
})

export const WorkflowConnectionSchema = z.record(
  z.string(),
  z.object({
    main: z.array(
      z.array(
        z.object({
          node: z.string(),
          type: z.string(),
          index: z.number(),
        })
      )
    ),
  })
)

export const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  nodes: z.array(WorkflowNodeSchema),
  connections: WorkflowConnectionSchema,
  settings: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
})

export const CredentialSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  nodesAccess: z.array(z.object({
    nodeType: z.string(),
  })).optional(),
})

// Internal Type Schemas
export const CredentialRefSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  requiredFor: z.string().optional(),
  nodeId: z.string().optional(),
  nodeName: z.string().optional(),
})

export const PlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  credentialsNeeded: z.array(CredentialRefSchema),
  credentialsAvailable: z.array(CredentialRefSchema).optional(),
  workflow: z.object({
    name: z.string(),
    nodes: z.array(z.unknown()),
    connections: z.record(z.unknown()),
    settings: z.record(z.unknown()).optional(),
  }),
})

// Chat Message Schemas
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  text: z.string(),
  timestamp: z.number(),
  plan: PlanSchema.optional(),
})

// API Response Wrappers
export const WorkflowsListResponseSchema = z.array(WorkflowSummarySchema)
export const CredentialsListResponseSchema = z.array(CredentialSummarySchema)

// Type exports for use in application
export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>
export type Workflow = z.infer<typeof WorkflowSchema>
export type CredentialSummary = z.infer<typeof CredentialSummarySchema>
export type CredentialRef = z.infer<typeof CredentialRefSchema>
export type Plan = z.infer<typeof PlanSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
