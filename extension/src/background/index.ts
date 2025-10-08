import type { ChatRequest, BackgroundMessage, ApplyPlanRequest } from '../lib/types/messaging'
import type { ChatMessage } from '../lib/types/chat'
import { orchestrator } from '../lib/orchestrator'
import { createN8nClient } from '../lib/n8n'
import { getOpenAiKey, getN8nApiKey, getBaseUrl } from '../lib/services/settings'
import { injectCredentials, getCredentialMatchStats } from '../lib/credentials/matcher'

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

  // Fetch available credentials and inject them into workflow nodes
  let workflow = msg.plan.workflow
  try
  {
    const availableCredentials = await n8n.listCredentials()
    if (availableCredentials && availableCredentials.length > 0)
    {
      workflow = injectCredentials(workflow, availableCredentials)

      // Log credential matching stats
      const stats = getCredentialMatchStats(msg.plan.workflow, availableCredentials)
      if (stats.nodesWithMatchedCredentials > 0)
      {
        post({
          type: 'token',
          token: `\n✓ Auto-linked ${stats.nodesWithMatchedCredentials} node(s) to existing credentials`
        } satisfies BackgroundMessage)
      }
    }
  }
  catch (error)
  {
    // Credential injection is optional - continue without it if it fails
    console.warn('Could not inject credentials:', error)
  }

  const result = await n8n.createWorkflow(workflow)

  // Generate deep link to workflow
  const workflowUrl = `${baseUrl}/workflow/${result.id}`
  post({ type: 'token', token: `\n✅ Created workflow: [Open in n8n →](${workflowUrl})` } satisfies BackgroundMessage)

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

async function handleChat(msg: ChatRequest, post: (m: BackgroundMessage) => void): Promise<void>
{
  const apiKey = await getOpenAiKey()

  if (!apiKey)
  {
    post({ type: 'error', error: 'OpenAI API key not set. Configure it in Options.' } satisfies BackgroundMessage)
    return
  }

  // Fetch available credentials from n8n (using internal REST API)
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
    // Credentials fetch is optional - continue without them if it fails
    console.warn('Could not fetch n8n credentials:', error)
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
