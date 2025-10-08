/**
 * Validation module - Runtime type checking with Zod
 * 
 * This module provides:
 * - Zod schemas for n8n API responses and internal types
 * - Type guard functions for runtime type checking
 * - Validation utilities that throw or return undefined on failure
 */

export * from './schemas'
export * from './guards'
