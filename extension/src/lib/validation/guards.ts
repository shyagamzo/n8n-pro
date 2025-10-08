import { z } from 'zod'
import {
  WorkflowSummarySchema,
  WorkflowSchema,
  CredentialSummarySchema,
  PlanSchema,
  ChatMessageSchema,
  WorkflowsListResponseSchema,
  CredentialsListResponseSchema,
} from './schemas'
import type {
  WorkflowSummary,
  Workflow,
  CredentialSummary,
  Plan,
  ChatMessage,
} from './schemas'

/**
 * Type guards and validation utilities for runtime type checking
 */

export class ValidationError extends Error
{
  public readonly errors: z.ZodError

  constructor(message: string, errors: z.ZodError)
  {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/**
 * Validates data against a Zod schema and returns typed result
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T
{
  const result = schema.safeParse(data)
  
  if (!result.success)
  {
    throw new ValidationError(
      `Validation failed: ${result.error.message}`,
      result.error
    )
  }
  
  return result.data
}

/**
 * Validates data against a schema without throwing, returns boolean
 */
export function isValid<T>(schema: z.ZodSchema<T>, data: unknown): data is T
{
  return schema.safeParse(data).success
}

/**
 * Validates data and returns undefined if validation fails (safe variant)
 */
export function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown): T | undefined
{
  const result = schema.safeParse(data)
  return result.success ? result.data : undefined
}

// Type guard functions for common types
export function isWorkflowSummary(data: unknown): data is WorkflowSummary
{
  return isValid(WorkflowSummarySchema, data)
}

export function isWorkflow(data: unknown): data is Workflow
{
  return isValid(WorkflowSchema, data)
}

export function isCredentialSummary(data: unknown): data is CredentialSummary
{
  return isValid(CredentialSummarySchema, data)
}

export function isPlan(data: unknown): data is Plan
{
  return isValid(PlanSchema, data)
}

export function isChatMessage(data: unknown): data is ChatMessage
{
  return isValid(ChatMessageSchema, data)
}

// Validation functions that throw on error
export function validateWorkflowSummary(data: unknown): WorkflowSummary
{
  return validate(WorkflowSummarySchema, data)
}

export function validateWorkflow(data: unknown): Workflow
{
  return validate(WorkflowSchema, data)
}

export function validateWorkflowsList(data: unknown): WorkflowSummary[]
{
  return validate(WorkflowsListResponseSchema, data)
}

export function validateCredentialsList(data: unknown): CredentialSummary[]
{
  return validate(CredentialsListResponseSchema, data)
}

export function validatePlan(data: unknown): Plan
{
  return validate(PlanSchema, data)
}

export function validateChatMessage(data: unknown): ChatMessage
{
  return validate(ChatMessageSchema, data)
}
