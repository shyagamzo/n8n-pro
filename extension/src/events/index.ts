/**
 * Events Module - Public API
 *
 * Reactive event system for the n8n extension.
 * Provides a central event bus for all modules to emit and subscribe to events.
 *
 * See ./event-bus.ts for SystemEvents implementation.
 * See ./types.ts for event type definitions.
 * See ./emitters.ts for event emission helpers.
 */

// Core event bus
export { SystemEvents, systemEvents } from './event-bus'

// Type definitions
export type * from './types'

// Event emission helpers
export * from './emitters'

// Validation (Week 2 - Phase 2)
export * from './validation'
