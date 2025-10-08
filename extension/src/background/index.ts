import type { ChatRequest, BackgroundMessage, ApplyPlanRequest } from '../lib/types/messaging'
import type { ChatMessage } from '../lib/types/chat'
import { orchestrator } from '../lib/orchestrator'
import { createN8nClient } from '../lib/n8n'
import { getOpenAiKey, getN8nApiKey, getBaseUrl } from '../lib/services/settings'
import { validateWorkflow, formatValidationResult } from '../lib/validation/workflow'
import { debugWorkflowCreation, debugWorkflowCreated, debugWorkflowError } from '../lib/utils/debug'

chrome.runtime.onInstalled.addListener(() =>
{
  console.info('n8n Pro Extension installed')
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

async function handleApplyPlan(msg: ApplyPlanRequest, post: (m: BackgroundMessage) => void): Promise<void>
{
  const [n8nApiKey, baseUrl] = await Promise.all([getN8nApiKey(), getBaseUrl()])
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
    console.error('❌ n8n authorization failed:', {
      baseUrl,
      error: err.message,
      hasApiKey: !!n8nApiKey
    })
    post({ type: 'error', error: `n8n authorization failed. Check Base URL and API key. ${err.message}` } satisfies BackgroundMessage)
    return
  }

  // Log workflow creation attempt
  console.log('📤 Creating workflow in n8n:', {
    workflowName: msg.plan.workflow.name,
    nodeCount: msg.plan.workflow.nodes?.length || 0,
    baseUrl
  })

  // Validate workflow before sending
  const validation = validateWorkflow(msg.plan.workflow)
  if (!validation.valid)
  {
    console.error('❌ Workflow validation failed:', validation.errors)
    post({
      type: 'error',
      error: `Workflow validation failed:\n\n${formatValidationResult(validation)}\n\n**Debug info:** Check browser console for full workflow structure.`
    } satisfies BackgroundMessage)
    console.error('📋 Invalid workflow structure:', msg.plan.workflow)
    return
  }

  if (validation.warnings.length > 0)
  {
    console.warn('⚠️ Workflow validation warnings:', validation.warnings)
  }

  debugWorkflowCreation(msg.plan.workflow)

  // Normalize connections format for n8n API
  const normalizedWorkflow = {
    ...msg.plan.workflow,
    connections: normalizeConnections(msg.plan.workflow.connections)
  }

  try
  {
    const result = await n8n.createWorkflow(normalizedWorkflow)

    debugWorkflowCreated(result.id, `${baseUrl}/workflow/${result.id}`)
    console.log('✅ Workflow created successfully:', {
      workflowId: result.id,
      workflowName: msg.plan.workflow.name
    })

    // Generate deep link to workflow
    const workflowUrl = `${baseUrl}/workflow/${result.id}`
    post({ type: 'token', token: `\n✅ Created workflow: [Open in n8n →](${workflowUrl})` } satisfies BackgroundMessage)

    // Send workflow created notification for toast
    post({ type: 'workflow_created', workflowId: result.id, workflowUrl } satisfies BackgroundMessage)

    // If there are credentials needed, provide node-specific deep links
    if (msg.plan.credentialsNeeded && msg.plan.credentialsNeeded.length > 0)
    {
      post({ type: 'token', token: '\n\n**Next steps to activate:**' } satisfies BackgroundMessage)

      msg.plan.credentialsNeeded.forEach((cred, idx) =>
      {
        const nodeUrl = cred.nodeId
          ? `${baseUrl}/workflow/${result.id}/${encodeURIComponent(cred.nodeId)}`
          : workflowUrl
        const credUrl = `${baseUrl}/credentials/new/${encodeURIComponent(cred.type)}`

        const nodeName = cred.nodeName || cred.name || cred.type

        post({
          type: 'token',
          token: `\n${idx + 1}. **${nodeName}** node: [Open node →](${nodeUrl}) or [Create credential →](${credUrl})`
        } satisfies BackgroundMessage)
      })

      post({ type: 'token', token: '\n\n💡 **Tip:** If you already have credentials, click "Open node" to select them. Otherwise, create new ones.' } satisfies BackgroundMessage)
    }

    post({ type: 'done' } satisfies BackgroundMessage)
  }
  catch (error)
  {
    debugWorkflowError(error, msg.plan.workflow)

    // Enhanced error reporting
    const err = error as { message?: string; status?: number; body?: unknown }

    console.error('❌ Workflow creation failed:', {
      error: err.message || String(error),
      status: err.status,
      body: err.body,
      workflow: msg.plan.workflow
    })

    // Build detailed error message
    let errorMessage = '❌ **Failed to create workflow**\n\n'

    if (err.status)
    {
      errorMessage += `**HTTP Status:** ${err.status}\n`
    }

    errorMessage += `**Error:** ${err.message || String(error)}\n\n`

    if (err.body && typeof err.body === 'object')
    {
      const body = err.body as Record<string, unknown>
      if (body.message)
      {
        errorMessage += `**Details:** ${body.message}\n\n`
      }

      // Include specific n8n validation errors if available
      if (body.errors && Array.isArray(body.errors))
      {
        errorMessage += '**Validation errors:**\n'
        body.errors.forEach((e: unknown) =>
        {
          if (typeof e === 'string')
          {
            errorMessage += `- ${e}\n`
          }
          else if (e && typeof e === 'object')
          {
            const errObj = e as Record<string, unknown>
            errorMessage += `- ${errObj.message || JSON.stringify(e)}\n`
          }
        })
        errorMessage += '\n'
      }
    }

    errorMessage += '**Troubleshooting:**\n'
    errorMessage += '1. Check browser console for full workflow structure\n'
    errorMessage += '2. Verify node types and parameters are correct\n'
    errorMessage += '3. Ensure all required node parameters are provided\n'
    errorMessage += '4. Check n8n server logs for additional details\n'

    post({ type: 'error', error: errorMessage } satisfies BackgroundMessage)
  }
}

async function handleChat(msg: ChatRequest, post: (m: BackgroundMessage) => void): Promise<void>
{
  const apiKey = await getOpenAiKey()

  if (!apiKey)
  {
    post({ type: 'error', error: 'OpenAI API key not set. Configure it in Options.' } satisfies BackgroundMessage)
    return
  }

  console.log('💬 Handling chat message:', { messageCount: msg.messages.length })

  // Send progress: Analyzing request
  post({ type: 'progress', status: 'Analyzing your request...', step: 1, total: 3 } satisfies BackgroundMessage)

  // First, check if we have enough information to generate a plan
  const readiness = await orchestrator.isReadyToPlan({
    apiKey,
    messages: (msg.messages as ChatMessage[]),
  })

  console.log('🔍 Readiness check:', readiness)

  // Send progress: Generating response
  post({ type: 'progress', status: 'Generating response...', step: 2, total: 3 } satisfies BackgroundMessage)

  // Generate conversational response (this happens regardless)
  const reply: string = await orchestrator.handle({
    apiKey,
    messages: (msg.messages as ChatMessage[]),
  }, (token) => post({ type: 'token', token } satisfies BackgroundMessage))

  if (reply && reply.length > 0)
  {
    post({ type: 'token', token: reply } satisfies BackgroundMessage)
  }

  // Only generate plan if we have enough information
  if (readiness.ready)
  {
    console.log('✅ Ready to plan - generating workflow')

    // Send progress: Creating workflow plan
    post({ type: 'progress', status: 'Creating workflow plan...', step: 3, total: 3 } satisfies BackgroundMessage)

    try
    {
      const plan = await orchestrator.plan({
        apiKey,
        messages: (msg.messages as ChatMessage[]),
      })

      post({ type: 'plan', plan } satisfies BackgroundMessage)
      console.log('📋 Plan generated and sent:', { title: plan.title })
    }
    catch (error)
    {
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
  const post = createSafePost(port)
  port.onMessage.addListener(async (msg: ChatRequest | ApplyPlanRequest) =>
  {
    try
    {
      if (msg?.type === 'apply_plan')
      {
        await handleApplyPlan(msg, post)
        return
      }

      if (msg?.type === 'chat')
      {
        await handleChat(msg, post)
      }
    }
    catch (err)
    {
      post({ type: 'error', error: (err as Error).message } satisfies BackgroundMessage)
    }
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
