import type { ChatMessage } from '../types/chat'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage, type MessageContent } from '@langchain/core/messages'

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

  function extractText(content: string | MessageContent[]): string
  {
    if (typeof content === 'string') return content
    // Only extract text parts from multi-part content
    return content
      .map((part) => (typeof part === 'string' ? part : 'text' in part ? (part.text ?? '') : ''))
      .join('')
  }

  return {
    async generateText(messages: ChatMessage[]): Promise<string>
    {
      const res = await llm.invoke(toLcMessages(messages))
      return extractText(res.content as string | MessageContent[])
    }
  }
}


