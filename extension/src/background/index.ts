import type { ChatRequest, BackgroundMessage, ApplyPlanRequest } from '../lib/types/messaging'
import type { ChatMessage } from '../lib/types/chat'
import { orchestrator } from '../lib/orchestrator'
import { createN8nClient } from '../lib/n8n'
import { getOpenAiKey, getN8nApiKey, getBaseUrl } from '../lib/services/settings'

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

    try { port.postMessage(message) }
    catch { /* ignore */ }
  }
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
    post({ type: 'error', error: `n8n authorization failed. Check Base URL and API key. ${err.message}` } satisfies BackgroundMessage)
    return
  }

  const result = await n8n.createWorkflow(msg.plan.workflow)
  post({ type: 'token', token: `\nCreated workflow with id: ${result.id}` } satisfies BackgroundMessage)
  post({ type: 'done' } satisfies BackgroundMessage)
}

async function handleChat(msg: ChatRequest, post: (m: BackgroundMessage) => void): Promise<void>
{
  const apiKey = await getOpenAiKey()

  if (!apiKey)
  {
    post({ type: 'error', error: 'OpenAI API key not set. Configure it in Options.' } satisfies BackgroundMessage)
    return
  }

  // Note: n8n API does not support listing credentials for security reasons
  // The planner will generate workflows without pre-checking credential availability
  // Users will need to configure credentials in n8n after workflow creation
  let availableCredentials: Array<{ id: string; name: string; type: string }> | undefined
  try
  {
    const [n8nApiKey, baseUrl] = await Promise.all([getN8nApiKey(), getBaseUrl()])
    if (n8nApiKey)
    {
      const n8n = createN8nClient({ apiKey: n8nApiKey || undefined, baseUrl: baseUrl || undefined })
      availableCredentials = await n8n.listCredentials()
    }
  }
  catch (error)
  {
    // Expected: n8n API doesn't support listing credentials
    // This is not an error - continue with empty credentials list
  }

  // Generate dynamic workflow plan based on conversation
  const plan = await orchestrator.plan({
    apiKey,
    messages: (msg.messages as ChatMessage[]),
    availableCredentials,
  })

  post({ type: 'plan', plan } satisfies BackgroundMessage)

  // Generate conversational response
  const reply: string = await orchestrator.handle({
    apiKey,
    messages: (msg.messages as ChatMessage[]),
    availableCredentials,
  }, (token) => post({ type: 'token', token } satisfies BackgroundMessage))

  if (reply && reply.length > 0)
  {
    post({ type: 'token', token: reply } satisfies BackgroundMessage)
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

  ;(async () =>
  {
    try
    {
      const [n8nApiKey, baseUrl] = await Promise.all([getN8nApiKey(), getBaseUrl()])
      const n8n = createN8nClient({ apiKey: n8nApiKey || undefined, baseUrl: baseUrl || undefined })
      await n8n.createWorkflow(msg.plan.workflow)
    }
    catch
    {
      // one-off; UI will show background errors through chat flow if needed later
    }
  })()

  // Immediately acknowledge to satisfy sendMessage callbacks, if any
  try { sendResponse({ ok: true }) }
  catch
  {
    // ignore
  }

  return true
})
