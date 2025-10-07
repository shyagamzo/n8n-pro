import type { ChatRequest, BackgroundMessage } from '../lib/types/messaging'
import { streamChatCompletion } from '../lib/services/openai'

chrome.runtime.onInstalled.addListener(() =>
{
  console.info('n8n Pro Extension installed')
})

chrome.runtime.onConnect.addListener((port) =>
{
  if (port.name !== 'chat') return
  port.onMessage.addListener(async (msg: ChatRequest) =>
  {
    if (msg?.type !== 'chat') return

    try
    {
      const apiKey = await getOpenAiKey()

      if (!apiKey)
      {
        port.postMessage({ type: 'error', error: 'OpenAI API key not set. Configure it in Options.' } satisfies BackgroundMessage)
        return
      }

      await streamChatCompletion(apiKey, msg.text, (token) =>
      {
        port.postMessage({ type: 'token', token } satisfies BackgroundMessage)
      })

      port.postMessage({ type: 'done' } satisfies BackgroundMessage)
    }
    catch (err)
    {
      port.postMessage({ type: 'error', error: (err as Error).message } satisfies BackgroundMessage)
    }
  })
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





