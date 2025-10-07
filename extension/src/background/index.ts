chrome.runtime.onInstalled.addListener(() => {
  console.info('n8n Pro Extension installed')
})

type ChatRequest = { type: 'chat'; text: string }
type BackgroundMessage = { type: 'token'; token: string } | { type: 'done' } | { type: 'error'; error: string }

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'chat') return
  port.onMessage.addListener(async (msg: ChatRequest) => {
    if (msg?.type !== 'chat') return
    try {
      const apiKey = await getOpenAiKey()
      if (!apiKey) {
        port.postMessage({ type: 'error', error: 'OpenAI API key not set. Configure it in Options.' } satisfies BackgroundMessage)
        return
      }
      await streamOpenAiCompletion(apiKey, msg.text, (token) => {
        port.postMessage({ type: 'token', token } satisfies BackgroundMessage)
      })
      port.postMessage({ type: 'done' } satisfies BackgroundMessage)
    } catch (err) {
      port.postMessage({ type: 'error', error: (err as Error).message } satisfies BackgroundMessage)
    }
  })
})

async function getOpenAiKey(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openai_api_key'], (res) => {
      const key = (res?.openai_api_key as string | undefined) ?? null
      resolve(key)
    })
  })
}

async function streamOpenAiCompletion(apiKey: string, prompt: string, onToken: (t: string) => void): Promise<void> {
  const url = 'https://api.openai.com/v1/chat/completions'
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an assistant that helps build and improve n8n workflows.' },
      { role: 'user', content: prompt }
    ],
    stream: true
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })
  if (!resp.ok || !resp.body) {
    throw new Error(`OpenAI request failed: ${resp.status}`)
  }
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let done = false
  while (!done) {
    const chunk = await reader.read()
    done = !!chunk.done
    const text = decoder.decode(chunk.value || new Uint8Array(), { stream: !done })
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') {
        done = true
        break
      }
      try {
        const json = JSON.parse(data)
        const delta = json?.choices?.[0]?.delta?.content
        if (typeof delta === 'string') onToken(delta)
      } catch {
        // ignore malformed lines
      }
    }
  }
}





