export type OpenAiStreamOptions = {
  model?: string
  timeoutMs?: number
}

const DEFAULTS: Required<Pick<OpenAiStreamOptions, 'model' | 'timeoutMs'>> = {
  model: 'gpt-4o-mini',
  timeoutMs: 60000
}

export async function streamChatCompletion(
  apiKey: string,
  userText: string,
  onToken: (t: string) => void,
  opts: OpenAiStreamOptions = {}
): Promise<void> {
  const { model, timeoutMs } = { ...DEFAULTS, ...opts }

  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are an assistant that helps build and improve n8n workflows.' },
      { role: 'user', content: userText }
    ],
    stream: true
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    if (!resp.ok || !resp.body) throw new Error(`OpenAI request failed: ${resp.status}`)

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let done = false
    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (!value) continue
      const chunk = decoder.decode(value, { stream: !done })
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const delta = json?.choices?.[0]?.delta?.content
          if (typeof delta === 'string') onToken(delta)
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  } finally {
    clearTimeout(timer)
  }
}


