import type { ChatRequest, BackgroundMessage, ApplyPlanRequest } from '../lib/types/messaging'
import type { ChatMessage } from '../lib/types/chat'
import { getOrchestrator, cleanupOrchestrator } from './orchestrator-manager'
import { createN8nClient } from '../lib/n8n'
import { getOpenAiKey, getN8nApiKey, getBaseUrl } from '../lib/services/settings'
import { debugWorkflowCreated, debugWorkflowError } from '../lib/utils/debug'

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
      // Port disconnected or content script unloaded
      console.warn('Failed to send message to content script:', error)
    }
  }
}

/**
 * Transform connections to n8n's expected format (double-nested arrays)
 * n8n expects: { "NodeName": { "main": [[{ node, type, index }]] } }
 * LLM might generate: { "NodeName": { "main": [{ node, type, index }] } }
 */
function normalizeConnections(connections: unknown): Record<string, unknown>
{
  if (!connections || typeof connections !== 'object') return {}

  const normalized: Record<string, unknown> = {}
  const conns = connections as Record<string, unknown>

  for (const [sourceNode, outputs] of Object.entries(conns))
  {
    if (!outputs || typeof outputs !== 'object') continue

    const normalizedOutputs: Record<string, unknown> = {}
    const outputsObj = outputs as Record<string, unknown>

    for (const [outputType, connections] of Object.entries(outputsObj))
    {
      if (!Array.isArray(connections))
      {
        normalizedOutputs[outputType] = []
        continue
      }

      // Check if it's already double-nested
      if (connections.length > 0 && Array.isArray(connections[0]))
      {
        // Already double-nested, keep as is
        normalizedOutputs[outputType] = connections
      }
      else
      {
        // Single-nested, wrap in outer array
        normalizedOutputs[outputType] = [connections]
      }
    }

    normalized[sourceNode] = normalizedOutputs
  }

  return normalized
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

  const n8n = createN8nClient({ apiKey: n8nApiKey || undefined, baseUrl: baseUrl || undefined })
  post({ type: 'token', token: '\nApplying plan…' } satisfies BackgroundMessage)

  // Quick auth check
  try
  {
    await n8n.getWorkflows()
  }
  catch (e)
  {
    const err = e as Error
    emitApiError(err, 'n8n-auth-check', { baseUrl, hasApiKey: !!n8nApiKey })
    console.error('❌ n8n authorization failed:', {
      baseUrl,
      error: err.message,
      hasApiKey: !!n8nApiKey
    })
    post({ type: 'error', error: `n8n authorization failed. Check Base URL and API key. ${err.message}` } satisfies BackgroundMessage)
    return
  }

  // Get session-specific orchestrator
  const orchestrator = getOrchestrator(sessionId)

  // Log workflow creation attempt
  console.log('📤 Resuming workflow creation from executor interrupt:', {
    workflowName: msg.plan.workflow.name,
    nodeCount: msg.plan.workflow.nodes?.length || 0,
    sessionId
  })

  try
  {
    // Resume graph execution from executor interrupt
    // The executor node will create the workflow in n8n
    const result = await orchestrator.applyWorkflow(openaiApiKey, n8nApiKey)

    if (!result.workflowId)
    {
      throw new Error('Workflow creation did not return a workflow ID')
    }

    // Emit workflow created event (subscribers will handle logging and UI updates)
    emitWorkflowCreated(msg.plan.workflow, result.workflowId)

    debugWorkflowCreated(result.workflowId, `${baseUrl}/workflow/${result.workflowId}`)
    console.log('✅ Workflow created successfully:', {
      workflowId: result.workflowId,
      workflowName: msg.plan.workflow.name
    })

    // Generate deep link to workflow
    const workflowUrl = `${baseUrl}/workflow/${result.workflowId}`
    post({ type: 'token', token: `\n✅ Created workflow: [Open in n8n →](${workflowUrl})` } satisfies BackgroundMessage)

    // Send workflow created notification for toast
    post({ type: 'workflow_created', workflowId: result.workflowId, workflowUrl } satisfies BackgroundMessage)

    // If there are credentials needed from the orchestrator
    if (result.credentialGuidance && result.credentialGuidance.missing.length > 0)
    {
      post({ type: 'token', token: '\n\n**Next steps to activate:**' } satisfies BackgroundMessage)

      result.credentialGuidance.missing.forEach((cred, idx) =>
      {
        const setupLink = result.credentialGuidance!.setupLinks.find(link => link.name === cred.name)
        const credUrl = setupLink?.url || `${baseUrl}/credentials/new/${encodeURIComponent(cred.type)}`

        post({
          type: 'token',
          token: `\n${idx + 1}. **${cred.name}** (${cred.type}): [Create credential →](${credUrl})`
        } satisfies BackgroundMessage)
      })

      post({ type: 'token', token: '\n\n💡 **Tip:** Set up these credentials to activate your workflow.' } satisfies BackgroundMessage)
    }

    post({ type: 'done' } satisfies BackgroundMessage)
  }
  catch (error)
  {
    // Emit workflow failed event (subscribers will handle logging and UI updates)
    const errorObj = error instanceof Error ? error : new Error(String(error))
    emitWorkflowFailed(msg.plan.workflow, errorObj)

    debugWorkflowError(error, msg.plan.workflow)

    // Enhanced error reporting
    const err = error as { message?: string; status?: number; body?: unknown }

    console.error('❌ Workflow creation failed:', {
      error: err.message || String(error),
      sessionId,
      workflow: msg.plan.workflow
    })

    // Build detailed error message
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

  console.log('💬 Handling chat message:', { messageCount: msg.messages.length, sessionId })

  // Get session-specific orchestrator
  const orchestrator = getOrchestrator(sessionId)

  // First, check if we have enough information to generate a plan
  const readiness = await orchestrator.isReadyToPlan({
    apiKey,
    messages: (msg.messages as ChatMessage[]),
  })

  console.log('🔍 Readiness check:', readiness)

  // Generate conversational response
  await orchestrator.handle({
    apiKey,
    messages: (msg.messages as ChatMessage[]),
  }, (token) => post({ type: 'token', token } satisfies BackgroundMessage))


  // Only generate plan if we have enough information
  if (readiness.ready)
  {
    console.log('✅ Ready to plan - generating workflow')

    if (!n8nApiKey)
    {
      post({
        type: 'error',
        error: 'n8n API key not set. Configure it in Options to create workflows.'
      } satisfies BackgroundMessage)
      post({ type: 'done' } satisfies BackgroundMessage)
      return
    }

    try
    {
      // Generate plan (runs until executor interrupt)
      // Events (agent lifecycle, LLM calls) automatically emitted by LangGraph bridge
      const plan = await orchestrator.plan({
        apiKey,
        messages: (msg.messages as ChatMessage[]),
      })

      post({ type: 'plan', plan } satisfies BackgroundMessage)
      console.log('📋 Plan generated and sent:', { title: plan.title })
    }
    catch (error)
    {
      emitApiError(error, 'plan-generation')
      console.error('❌ Plan generation failed:', error)
      post({
        type: 'error',
        error: `Failed to generate workflow plan: ${(error as Error).message}`
      } satisfies BackgroundMessage)
    }
  }
  else
  {
    console.log('⏳ Not ready to plan yet:', readiness.reason)
    // No plan sent - assistant is still gathering requirements
  }

  post({ type: 'done' } satisfies BackgroundMessage)
}

chrome.runtime.onConnect.addListener((port) =>
{
  if (port.name !== 'chat') return

  // Generate session ID based on tab ID or use random ID
  const sessionId = port.sender?.tab?.id?.toString() || crypto.randomUUID()
  console.log('🔌 New chat connection:', { sessionId, tabId: port.sender?.tab?.id })

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

  // Clean up orchestrator when port disconnects
  port.onDisconnect.addListener(() =>
  {
    console.log('🔌 Chat disconnected:', { sessionId })
    cleanupOrchestrator(sessionId)
  })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) =>
{
  const msg = message as ApplyPlanRequest
  if (msg?.type !== 'apply_plan') return

  void (async () =>
  {
    try
    {
      const [n8nApiKey, baseUrl] = await Promise.all([getN8nApiKey(), getBaseUrl()])
      const n8n = createN8nClient({ apiKey: n8nApiKey || undefined, baseUrl: baseUrl || undefined })

      // Log workflow creation attempt
      console.log('📤 Creating workflow from one-off message:', {
        workflowName: msg.plan.workflow.name,
        nodeCount: msg.plan.workflow.nodes?.length || 0
      })

      // Normalize connections format for n8n API
      const normalizedWorkflow = {
        ...msg.plan.workflow,
        connections: normalizeConnections(msg.plan.workflow.connections)
      }

      await n8n.createWorkflow(normalizedWorkflow)
      console.log('✅ Workflow created successfully from one-off message')
    }
    catch (error)
    {
      // One-off message handler - errors are shown through chat flow in primary use case
      console.error('❌ Failed to create workflow from one-off message:', {
        error,
        workflow: msg.plan.workflow
      })
    }
  })()

  // Immediately acknowledge to satisfy sendMessage callbacks, if any
  try
  {
    sendResponse({ ok: true })
  }
  catch (error)
  {
    // Sender context may be invalidated
    console.warn('Failed to send response:', error)
  }

  return true
})

