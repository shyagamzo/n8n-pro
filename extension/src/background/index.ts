import type { ChatRequest, BackgroundMessage, ApplyPlanRequest } from '../lib/types/messaging'
// import { streamChatCompletion } from '../lib/services/openai'
import { orchestrator } from '../lib/orchestrator'
import type { ChatMessage } from '../lib/types/chat'
import { createN8nClient } from '../lib/n8n'

chrome.runtime.onInstalled.addListener(() =>
{
  console.info('n8n Pro Extension installed')
})

chrome.runtime.onConnect.addListener((port) =>
{
  if (port.name !== 'chat') return
  port.onMessage.addListener(async (msg: ChatRequest | ApplyPlanRequest) =>
  {
    if (msg?.type === 'apply_plan')
    {
      try
      {
        const n8nApiKey = await getN8nApiKey()
        const n8n = createN8nClient({ apiKey: n8nApiKey ?? undefined })
        // Acknowledge receipt to keep UI channel confident
        port.postMessage({ type: 'token', token: '\nApplying plan…' } satisfies BackgroundMessage)
        const result = await n8n.createWorkflow(msg.plan.workflow)
        port.postMessage({ type: 'token', token: `\nCreated workflow with id: ${result.id}` } satisfies BackgroundMessage)
        port.postMessage({ type: 'done' } satisfies BackgroundMessage)
      }
      catch (err)
      {
        port.postMessage({ type: 'error', error: (err as Error).message } satisfies BackgroundMessage)
      }
      return
    }

    if (msg?.type !== 'chat') return

    try
    {
      const apiKey = await getOpenAiKey()

      if (!apiKey)
      {
        port.postMessage({ type: 'error', error: 'OpenAI API key not set. Configure it in Options.' } satisfies BackgroundMessage)
        return
      }

      // Generate a plan and send it to the UI; then also produce a textual reply
      const plan = await orchestrator.plan()
      port.postMessage({ type: 'plan', plan } satisfies BackgroundMessage)

      const reply: string = await orchestrator.handle({
        apiKey,
        messages: msg.messages as ChatMessage[],
      }, (token) => port.postMessage({ type: 'token', token } satisfies BackgroundMessage))

      // Ensure any remaining content ends up as final assistant message.
      if (reply && reply.length > 0)
      {
        // Send any non-streamed tail as a token to merge into draft.
        port.postMessage({ type: 'token', token: reply } satisfies BackgroundMessage)
      }

      port.postMessage({ type: 'done' } satisfies BackgroundMessage)
    }
    catch (err)
    {
      port.postMessage({ type: 'error', error: (err as Error).message } satisfies BackgroundMessage)
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
      const n8nApiKey = await getN8nApiKey()
      const n8n = createN8nClient({ apiKey: n8nApiKey ?? undefined })
      await n8n.createWorkflow(msg.plan.workflow)
    }
    catch
    {
      // one-off; UI will show background errors through chat flow if needed later
    }
  })()
  // Immediately acknowledge to satisfy sendMessage callbacks, if any
  try { sendResponse({ ok: true }) } catch { /* ignore */ }
  return true
})

async function getOpenAiKey(): Promise<string | null>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get(['openai_api_key'], (res) =>
    {
      const key = (res?.openai_api_key as string | undefined) ?? null
      resolve(key)
    })
  })
}

async function getN8nApiKey(): Promise<string | null>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get(['n8n_api_key'], (res) =>
    {
      const key = (res?.n8n_api_key as string | undefined) ?? null
      resolve(key)
    })
  })
}





