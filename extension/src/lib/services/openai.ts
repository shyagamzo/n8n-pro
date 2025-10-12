import type { ChatMessage } from '../types/chat'
import { DEFAULTS } from '../constants'
import { fetchWithTimeout } from '../utils/fetch'
import { emitSystemDebug } from '../events/emitters'

export type OpenAiStreamOptions = {
  model?: string
  timeoutMs?: number
}

export async function streamChatCompletion(
  apiKey: string,
  messages: ChatMessage[],
  onToken: (t: string) => void,
  opts: OpenAiStreamOptions = {}
): Promise<void>
{
  const model = opts.model ?? DEFAULTS.OPENAI_MODEL
  const timeoutMs = opts.timeoutMs ?? DEFAULTS.OPENAI_TIMEOUT_MS

  const body = buildChatBody(messages, model)

  const resp = await fetchWithTimeout(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    },
    timeoutMs
  )

  if (!resp.ok) throw new Error(`OpenAI request failed: ${resp.status}`)

  await readSseStream(resp, onToken)
}

function buildChatBody(messages: ChatMessage[], model: string): unknown
{
  return {
    model,
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.text
    })),
    stream: true
  }
}

async function readSseStream(resp: Response, onToken: (t: string) => void): Promise<void>
{
  const body = resp.body
  if (!body) throw new Error('Missing response body')

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let done = false

  while (!done)
  {
    const { value, done: readerDone } = await reader.read()
    done = readerDone
    if (!value) continue

    const chunk = decoder.decode(value, { stream: !done })
    const shouldStop = processSseChunk(chunk, onToken)
    if (shouldStop) return
  }
}

function processSseChunk(chunk: string, onToken: (t: string) => void): boolean
{
  for (const raw of chunk.split('\n'))
  {
    const line = raw.trim()
    if (!line || !line.startsWith('data:')) continue

    const data = line.slice(5).trim()
    if (data === '[DONE]') return true

    try
    {
      const json = JSON.parse(data)
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string') onToken(delta)
    }
    catch (error)
    {
      // Ignore malformed SSE lines - they may be incomplete chunks
      emitSystemDebug('openai', 'Skipping malformed SSE line', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return false
}


