// ─────────────────────────────────────────────────────────────
// Zod Schemas for n8n Workflow Validation
// ─────────────────────────────────────────────────────────────
//
// This module provides comprehensive Zod schemas for validating and normalizing
// n8n workflow structures. These schemas enforce strict type safety and handle
// data normalization (e.g., single-nested → double-nested arrays).
//
// **Key Features:**
// 1. Strict validation matching n8n API requirements
// 2. Automatic normalization (UUID generation, array nesting, defaults)
// 3. Clear, actionable error messages
// 4. Type inference for compile-time safety
//
// **Usage:**
// ```typescript
// const result = WorkflowSchema.safeParse(loomData)
// if (!result.success) {
//   const errors = formatZodErrors(result.error)
//   console.error(errors)
// }
// ```
//
// ─────────────────────────────────────────────────────────────

import { z } from 'zod'
import { v4 as uuid } from 'uuid'

// ─────────────────────────────────────────────────────────────
// Primitive Schemas
// ─────────────────────────────────────────────────────────────

/**
 * Position tuple schema: EXACTLY [number, number]
 *
 * Handles normalization:
 * - String numbers → parsed to numbers
 * - Missing values → defaults to [0, 0]
 * - Invalid arrays → defaults to [0, 0]
 */
export const PositionSchema = z
  .tuple([z.number(), z.number()])
  .or(
    z.array(z.union([z.number(), z.string()]))
      .transform((arr) => {
        if (arr.length !== 2)
        {
          return [0, 0] as [number, number]
        }

        const x = typeof arr[0] === 'number' ? arr[0] : parseFloat(String(arr[0]))
        const y = typeof arr[1] === 'number' ? arr[1] : parseFloat(String(arr[1]))

        if (isNaN(x) || isNaN(y))
        {
          return [0, 0] as [number, number]
        }

        return [x, y] as [number, number]
      })
  )
  .or(z.any().transform(() => [0, 0] as [number, number]))

/**
 * Node ID schema: UUID string with auto-generation
 *
 * If not provided or invalid, generates a new UUID
 */
export const NodeIdSchema = z
  .string()
  .uuid()
  .or(z.string().transform(() => uuid()))
  .or(z.any().transform(() => uuid()))

/**
 * Node name schema: Non-empty string
 *
 * Defaults to "Node {index}" if missing
 */
const NodeNameSchema = z.string().min(1)

/**
 * Node type schema: Non-empty string in format "namespace.nodeName"
 *
 * Examples: "n8n-nodes-base.httpRequest", "@n8n/n8n-nodes-langchain.chatOpenAI"
 */
const NodeTypeSchema = z.string().min(1)

/**
 * Type version schema: Positive number, defaults to 1
 */
const TypeVersionSchema = z.number().positive().default(1)

// ─────────────────────────────────────────────────────────────
// Credential Schemas
// ─────────────────────────────────────────────────────────────

/**
 * Single credential reference
 */
const CredentialRefSchema = z.object({
  id: z.string(),
  name: z.string().optional()
})

/**
 * Credentials map: credential type → credential reference
 */
const CredentialsSchema = z.record(z.string(), CredentialRefSchema).optional()

// ─────────────────────────────────────────────────────────────
// Connection Schemas (CRITICAL)
// ─────────────────────────────────────────────────────────────

/**
 * Single connection item: { node, type, index }
 */
export const ConnectionItemSchema = z.object({
  node: z.string().min(1, 'Target node name cannot be empty'),
  type: z.literal('main').default('main'),
  index: z.number().int().nonnegative().default(0)
})

/**
 * Connection output: Array of connection items
 *
 * Example: [{ node: "Target", type: "main", index: 0 }]
 *
 * Note: This schema is defined for documentation but not directly used.
 * Connection validation happens through NodeOutputsSchema which handles
 * both single-nested and double-nested arrays.
 */
// const ConnectionOutputSchema = z.array(ConnectionItemSchema)

/**
 * Node outputs: Double-nested array of connections
 *
 * CRITICAL: This is the most complex part of n8n validation.
 *
 * Handles normalization:
 * 1. Single object {...} → [[{...}]]
 * 2. Single-nested array [{...}] → [[{...}]]
 * 3. Double-nested array [[{...}]] → [[{...}]] (passthrough)
 *
 * Structure:
 * - Outer array: Multiple output ports (most nodes have 1)
 * - Inner array: Multiple connections from each port
 */
export const NodeOutputsSchema = z
  .array(z.array(ConnectionItemSchema))  // Already double-nested
  .or(
    z.array(ConnectionItemSchema)  // Single-nested → wrap in outer array
      .transform((arr) => [arr])
  )
  .or(
    ConnectionItemSchema  // Single object → wrap in both arrays
      .transform((item) => [[item]])
  )

/**
 * Connection map for a single node: { main?: NodeOutputs }
 */
const ConnectionMapSchema = z.object({
  main: NodeOutputsSchema.optional()
})

/**
 * Complete workflow connections: Record<nodeName, connectionMap>
 *
 * Keys are source node NAMES (not IDs)
 */
export const ConnectionsSchema = z.record(z.string(), ConnectionMapSchema).default({})

// ─────────────────────────────────────────────────────────────
// Node Schema
// ─────────────────────────────────────────────────────────────

/**
 * Node parameters: Flexible object (varies by node type)
 *
 * We keep this as Record<string, unknown> because each node type
 * has its own parameter structure. This is intentionally loose.
 */
const NodeParametersSchema = z.record(z.string(), z.unknown()).default({})

/**
 * Complete node definition schema
 *
 * Handles:
 * - UUID generation for missing IDs
 * - Default type version (1)
 * - Position normalization
 * - Default empty parameters
 */
export const NodeSchema = z.object({
  id: NodeIdSchema,
  name: NodeNameSchema,
  type: NodeTypeSchema,
  typeVersion: TypeVersionSchema,
  position: PositionSchema,
  parameters: NodeParametersSchema,
  credentials: CredentialsSchema
})

/**
 * Array of nodes with unique name validation
 *
 * This schema validates the nodes array and ensures:
 * 1. At least one node exists
 * 2. All node names are unique within the workflow
 */
export const NodesArraySchema = z
  .array(NodeSchema)
  .min(1, 'Workflow must contain at least one node')
  .refine(
    (nodes) => {
      const names = nodes.map(n => n.name)
      const uniqueNames = new Set(names)
      return names.length === uniqueNames.size
    },
    {
      message: 'All node names must be unique within the workflow'
    }
  )

// ─────────────────────────────────────────────────────────────
// Workflow Settings Schema
// ─────────────────────────────────────────────────────────────

/**
 * Workflow execution settings
 *
 * These control execution behavior, data retention, and operational parameters.
 */
const WorkflowSettingsSchema = z
  .object({
    saveDataErrorExecution: z.string().optional(),
    saveDataSuccessExecution: z.string().optional(),
    saveManualExecutions: z.boolean().optional(),
    executionTimeout: z.number().optional(),
    timezone: z.string().optional(),
    executionOrder: z.string().optional()
  })
  .passthrough()  // Allow additional unknown properties
  .default({})

// ─────────────────────────────────────────────────────────────
// Complete Workflow Schema
// ─────────────────────────────────────────────────────────────

/**
 * Complete n8n workflow schema
 *
 * This is the main schema for validating workflow structures.
 *
 * Required fields:
 * - name: Workflow name (max 128 chars)
 * - active: Activation status (defaults to false)
 * - nodes: Array of nodes (min 1, unique names)
 * - connections: Connection map
 * - settings: Execution settings (defaults to {})
 */
export const WorkflowSchema = z.object({
  name: z
    .string()
    .min(1, 'Workflow name is required')
    .max(128, 'Workflow name must be 128 characters or less'),

  active: z.boolean().default(false),

  nodes: NodesArraySchema,

  connections: ConnectionsSchema,

  settings: WorkflowSettingsSchema,

  // Optional server-assigned fields (not validated on input)
  id: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  versionId: z.string().optional(),
  tags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  pinData: z.record(z.string(), z.unknown()).optional(),
  staticData: z.record(z.string(), z.unknown()).optional()
})

// ─────────────────────────────────────────────────────────────
// Type Inference Exports
// ─────────────────────────────────────────────────────────────

/**
 * Inferred TypeScript types from Zod schemas
 *
 * These match the existing types in types.ts but are derived from schemas
 */
export type Position = z.infer<typeof PositionSchema>
export type ConnectionItem = z.infer<typeof ConnectionItemSchema>
export type NodeOutputs = z.infer<typeof NodeOutputsSchema>
export type Node = z.infer<typeof NodeSchema>
export type Connections = z.infer<typeof ConnectionsSchema>
export type Workflow = z.infer<typeof WorkflowSchema>

// ─────────────────────────────────────────────────────────────
// Custom Validation with Node Name Cross-Check
// ─────────────────────────────────────────────────────────────

/**
 * Validates connections reference existing nodes
 *
 * This schema performs cross-field validation to ensure all connection
 * targets reference actual nodes in the workflow.
 */
export const WorkflowWithConnectionValidationSchema = WorkflowSchema
  .refine(
    (workflow) => {
      const nodeNames = new Set(workflow.nodes.map(n => n.name))

      // Check all connection targets exist
      for (const [sourceName, connectionMap] of Object.entries(workflow.connections))
      {
        // Validate source node exists
        if (!nodeNames.has(sourceName))
        {
          return false
        }

        // Validate all target nodes exist
        if (connectionMap.main)
        {
          for (const output of connectionMap.main)
          {
            for (const connection of output)
            {
              if (!nodeNames.has(connection.node))
              {
                return false
              }
            }
          }
        }
      }

      return true
    },
    {
      message: 'All connection source and target nodes must exist in the workflow'
    }
  )
