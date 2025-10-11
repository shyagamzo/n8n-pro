import type { ChatMessage } from '../types/chat'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'

export type ChatModelOptions = {
  apiKey: string
  model?: string
  temperature?: number
  timeoutMs?: number
}

export interface ChatModel
{
  generateText(messages: ChatMessage[]): Promise<string>
}

export function createOpenAiChatModel(options: ChatModelOptions): ChatModel
{
  const modelId = options.model ?? 'gpt-4o-mini'
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.2

  // The LangChain ChatOpenAI client is used for non-streaming orchestration steps.
  const llm = new ChatOpenAI({
    model: modelId,
    temperature,
    apiKey: options.apiKey,
    timeout: options.timeoutMs,
  })

  function toLcMessages(messages: ChatMessage[]): BaseMessage[]
  {
    return messages.map((m) =>
    {
      if (m.role === 'system') return new SystemMessage(m.text)
      if (m.role === 'assistant') return new AIMessage(m.text)
      return new HumanMessage(m.text)
    })
  }

  function extractText(content: unknown): string
  {
    if (typeof content === 'string') return content

    if (Array.isArray(content))
    {
      return content
        .map((part) =>
        {
          if (typeof part === 'string') return part

          if (part && typeof part === 'object' && 'text' in (part as Record<string, unknown>))
          {
            const maybeText = (part as Record<string, unknown>).text
            return typeof maybeText === 'string' ? maybeText : ''
          }

          return ''
        })
        .join('')
    }

    if (content && typeof content === 'object' && 'text' in (content as Record<string, unknown>))
    {
      const maybeText = (content as Record<string, unknown>).text
      return typeof maybeText === 'string' ? maybeText : ''
    }

    return ''
  }

  return {
    async generateText(messages: ChatMessage[]): Promise<string>
    {
      const res = await llm.invoke(toLcMessages(messages))
      return extractText(res.content)
    }
  }
}


