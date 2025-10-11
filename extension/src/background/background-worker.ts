import type { ChatRequest, BackgroundMessage, ApplyPlanRequest } from '../lib/types/messaging'
import type { ChatMessage } from '../lib/types/chat'
import { runGraph } from '../lib/orchestrator'
import { getOpenAiKey, getN8nApiKey, getBaseUrl } from '../lib/services/settings'

// Reactive event system
import {
  systemEvents,
  emitUnhandledError,
  emitApiError,
  emitWorkflowCreated,
  emitWorkflowFailed
} from '../lib/events'
import * as logger from '../lib/events/subscribers/logger'
import * as persistence from '../lib/events/subscribers/persistence'
import * as tracing from '../lib/events/subscribers/tracing'

// Initialize event subscribers (background context only)
// Note: chat and activity subscribers would run in wrong context (background vs content script)
// UI updates still use chrome.runtime messaging to reach content script's chatStore
logger.setup()
persistence.setup()
tracing.setup()

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    emitUnhandledError(event.reason, 'unhandledrejection')
  })
}

chrome.runtime.onInstalled.addListener(() =>
{
  console.info('n8n Pro Extension installed')
})

// Cleanup on extension suspend
chrome.runtime.onSuspend.addListener(() => {
  logger.cleanup()
  persistence.cleanup()
  tracing.cleanup()
  systemEvents.destroy()
})

function createSafePost(port: chrome.runtime.Port)
{
  let disconnected = false
  port.onDisconnect.addListener(() => { disconnected = true })

  return (message: BackgroundMessage): void =>
  {
    if (disconnected) return

    try
    {
      port.postMessage(message)
    }
    catch (error)
    {
      // Port disconnected or content script unloaded - silently ignore
      // This is expected when content script unloads mid-message
    }
  }
}

async function handleApplyPlan(
  msg: ApplyPlanRequest,
  post: (m: BackgroundMessage) => void,
  sessionId: string
): Promise<void>
{
  const [openaiApiKey, n8nApiKey, baseUrl] = await Promise.all([
    getOpenAiKey(),
    getN8nApiKey(),
    getBaseUrl()
  ])

  if (!openaiApiKey)
  {
    emitApiError(new Error('OpenAI API key not set'), 'handleApplyPlan')
    post({ type: 'error', error: 'OpenAI API key not set.' } satisfies BackgroundMessage)
    return
  }

  if (!n8nApiKey)
  {
    emitApiError(new Error('n8n API key not set'), 'handleApplyPlan')
    post({ type: 'error', error: 'n8n API key not set. Configure it in Options.' } satisfies BackgroundMessage)
    return
  }

  post({ type: 'token', token: '\nApplying plan…' } satisfies BackgroundMessage)

  try
  {
    // Resume graph execution from executor interrupt (null messages = resume from checkpoint)
    // The executor node will create the workflow in n8n
    const result = await runGraph({
      sessionId,
      apiKey: openaiApiKey,
      messages: [],  // Empty - resuming from checkpoint
      n8nApiKey,
      n8nBaseUrl: baseUrl || undefined
    })

    if (!result.workflowId)
    {
      throw new Error('Workflow creation did not return a workflow ID')
    }

    // Emit workflow created event (subscribers will handle logging)
    emitWorkflowCreated(msg.plan.workflow, result.workflowId)

    // Generate deep link to workflow
    const workflowUrl = `${baseUrl}/workflow/${result.workflowId}`
    post({ type: 'token', token: `\n✅ Created workflow: [Open in n8n →](${workflowUrl})` } satisfies BackgroundMessage)

    // Send workflow created notification for toast
    post({ type: 'workflow_created', workflowId: result.workflowId, workflowUrl } satisfies BackgroundMessage)

    post({ type: 'done' } satisfies BackgroundMessage)
  }
  catch (error)
  {
    // Emit workflow failed event (subscribers will handle logging)
    const errorObj = error instanceof Error ? error : new Error(String(error))
    emitWorkflowFailed(msg.plan.workflow, errorObj)

    // Build detailed error message
    const err = error as { message?: string; status?: number; body?: unknown }
    let errorMessage = '❌ **Failed to create workflow**\n\n'
    errorMessage += `**Error:** ${err.message || String(error)}\n\n`
    errorMessage += '**Troubleshooting:**\n'
    errorMessage += '1. Check browser console for full error details\n'
    errorMessage += '2. Verify n8n is running and accessible\n'
    errorMessage += '3. Ensure API credentials are configured correctly\n'

    post({ type: 'error', error: errorMessage } satisfies BackgroundMessage)
  }
}

async function handleChat(
  msg: ChatRequest,
  post: (m: BackgroundMessage) => void,
  sessionId: string
): Promise<void>
{

  // Handle normal chat message
  const [apiKey, n8nApiKey] = await Promise.all([getOpenAiKey(), getN8nApiKey()])

  if (!apiKey)
  {
    emitApiError(new Error('OpenAI API key not set'), 'handleChat')
    post({ type: 'error', error: 'OpenAI API key not set. Configure it in Options.' } satisfies BackgroundMessage)
    return
  }

  try {
    // Run graph - automatically handles: enrichment → orchestrator → planner (if ready)
    // Response is streamed via onToken, plan returned if orchestrator routed to planner
    const result = await runGraph({
      sessionId,
      apiKey,
      messages: (msg.messages as ChatMessage[]),
      n8nApiKey: n8nApiKey || undefined,
    }, (token) => post({ type: 'token', token } satisfies BackgroundMessage))

    // If graph generated a plan (orchestrator routed to planner)
    if (result.plan) {
      if (!n8nApiKey) {
        post({
          type: 'error',
          error: 'n8n API key not set. Configure it in Options to create workflows.'
        } satisfies BackgroundMessage)
        post({ type: 'done' } satisfies BackgroundMessage)
        return
      }

      // Send plan for user approval
      post({ type: 'plan', plan: result.plan } satisfies BackgroundMessage)
    }

    post({ type: 'done' } satisfies BackgroundMessage)
  } catch (error) {
    emitApiError(error, 'chat-orchestration')
    post({
      type: 'error',
      error: `Chat failed: ${(error as Error).message}`
    } satisfies BackgroundMessage)
    post({ type: 'done' } satisfies BackgroundMessage)
  }
}

chrome.runtime.onConnect.addListener((port) =>
{
  if (port.name !== 'chat') return

  // Generate session ID based on tab ID or use random ID
  const sessionId = port.sender?.tab?.id?.toString() || crypto.randomUUID()

  const post = createSafePost(port)

  port.onMessage.addListener(async (msg: ChatRequest | ApplyPlanRequest) =>
  {
    try
    {
      if (msg?.type === 'apply_plan')
      {
        await handleApplyPlan(msg, post, sessionId)
        return
      }

      if (msg?.type === 'chat')
      {
        await handleChat(msg, post, sessionId)
      }
    }
    catch (err)
    {
      emitUnhandledError(err, 'port-message-handler')
      post({ type: 'error', error: (err as Error).message } satisfies BackgroundMessage)
    }
  })

  // Port cleanup (no orchestrator instances to clean up - graph handles state)
  port.onDisconnect.addListener(() =>
  {
    // Graph checkpointer maintains state; no manual cleanup needed
  })
})

// Note: One-off message handler removed
// All workflow creation now happens through graph execution (executor node with tools)
// The executor node will handle workflow creation, normalization, and n8n API calls

