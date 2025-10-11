/**
 * Background Service Worker
 *
 * Pure message router - receives messages from content script and pipes to graph.
 * All business logic (routing, planning, execution) happens in graph nodes/tools.
 *
 * Responsibilities:
 * - Initialize reactive event subscribers
 * - Route messages to runGraph()
 * - Stream results back to content script
 * - Handle global errors
 */

import type { ChatRequest, BackgroundMessage, ApplyPlanRequest } from '../lib/types/messaging'
import type { ChatMessage } from '../lib/types/chat'
import { runGraph } from '../lib/orchestrator'
import { getOpenAiKey, getN8nApiKey, getBaseUrlOrDefault } from '../lib/services/settings'

// Reactive event system
import {
  systemEvents,
  emitUnhandledError,
  emitApiError
} from '../lib/events'
import * as logger from '../lib/events/subscribers/logger'
import * as persistence from '../lib/events/subscribers/persistence'
import * as tracing from '../lib/events/subscribers/tracing'
import * as messaging from '../lib/events/subscribers/messaging'

// Initialize event subscribers (background context only)
// Note: chat and activity subscribers run in content script (not here)
logger.setup()
persistence.setup()
tracing.setup()

// Messaging subscriber will be set up per-port connection (needs post function)

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    emitUnhandledError(event.reason, 'unhandledrejection')
  })
}

chrome.runtime.onInstalled.addListener(() => {
  console.info('n8n Pro Extension installed')
})

// Cleanup on extension suspend
chrome.runtime.onSuspend.addListener(() => {
  logger.cleanup()
  persistence.cleanup()
  tracing.cleanup()
  systemEvents.destroy()
})

/**
 * Create safe message poster that handles port disconnection
 */
function createSafePost(port: chrome.runtime.Port) {
  let disconnected = false
  port.onDisconnect.addListener(() => { disconnected = true })

  return (message: BackgroundMessage): void => {
    if (disconnected) return

    try {
      port.postMessage(message)
    } catch (error) {
      // Port disconnected - silently ignore (expected when content script unloads)
    }
  }
}

/**
 * Handle incoming messages - pure routing to graph
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'chat') return

  const sessionId = port.sender?.tab?.id?.toString() || crypto.randomUUID()
  const post = createSafePost(port)

  // Set up messaging subscriber to bridge events to this content script
  messaging.setup(post)

  port.onMessage.addListener(async (msg: ChatRequest | ApplyPlanRequest) => {
    try {
      // Get API keys from settings (with defaults applied)
      const [apiKey, n8nApiKey, baseUrl] = await Promise.all([
        getOpenAiKey(),
        getN8nApiKey(),
        getBaseUrlOrDefault()  // Returns default if not set
      ])

      // Check required API key
      if (!apiKey) {
        emitApiError(new Error('OpenAI API key not set'), 'message-handler')
        post({ type: 'error', error: 'OpenAI API key not set. Configure it in Options.' })
        post({ type: 'done' })
        return
      }

      // Extract messages based on message type
      const messages = msg.type === 'chat'
        ? (msg.messages as ChatMessage[])
        : []  // apply_plan uses empty messages (resumes from checkpoint)

      // Run graph - baseUrl already has default applied, no fallbacks needed downstream
      const result = await runGraph({
        sessionId,
        apiKey,
        messages,
        n8nApiKey,
        n8nBaseUrl: baseUrl  // Already defaulted by getBaseUrlOrDefault()
      }, (token) => post({ type: 'token', token }))

      // Send results (workflow_created sent automatically via messaging subscriber)
      if (result.plan) {
        post({ type: 'plan', plan: result.plan })
      }

      post({ type: 'done' })
    } catch (err) {
      emitUnhandledError(err, 'message-handler')
      post({ type: 'error', error: (err as Error).message })
      post({ type: 'done' })
    }
  })

  // Cleanup messaging subscriber when port disconnects
  port.onDisconnect.addListener(() => {
    messaging.cleanup()
  })
})
