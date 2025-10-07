export type OpenAiStreamOptions = {
  model?: string
  timeoutMs?: number
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_TIMEOUT_MS = 60000

export async function streamChatCompletion(
  apiKey: string,
  userText: string,
  onToken: (t: string) => void,
  opts: OpenAiStreamOptions = {}
): Promise<void> {
  const model = opts.model ?? DEFAULT_MODEL
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const body = buildChatBody(userText, model)
  const resp = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  }, timeoutMs)

  if (!resp.ok) throw new Error(`OpenAI request failed: ${resp.status}`)
  await readSseStream(resp, onToken)
}

function buildChatBody(userText: string, model: string): unknown {
  return {
    model,
    messages: [
      { role: 'system', content: 'You are an assistant that helps build and improve n8n workflows.' },
      { role: 'user', content: userText }
    ],
    stream: true
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function readSseStream(resp: Response, onToken: (t: string) => void): Promise<void> {
  const body = resp.body
  if (!body) throw new Error('Missing response body')
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let done = false
  while (!done) {
    const { value, done: readerDone } = await reader.read()
    done = readerDone
    if (!value) continue
    const chunk = decoder.decode(value, { stream: !done })
    const shouldStop = processSseChunk(chunk, onToken)
    if (shouldStop) return
  }
}

function processSseChunk(chunk: string, onToken: (t: string) => void): boolean {
  for (const raw of chunk.split('\n')) {
    const line = raw.trim()
    if (!line || !line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') return true
    try {
      const json = JSON.parse(data)
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string') onToken(delta)
    } catch {
      // ignore malformed SSE lines
    }
  }
  return false
}


