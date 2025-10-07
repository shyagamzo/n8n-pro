import type { ChatMessage } from '../types/chat'
import { createOpenAiChatModel } from '../ai/model'

export type OrchestratorInput = {
  apiKey: string
  messages: ChatMessage[]
}

export type StreamTokenHandler = (token: string) => void

class Orchestrator
{
  public async handle(input: OrchestratorInput, onToken?: StreamTokenHandler): Promise<string>
  {
    // MVP: simple pass-through using a single non-streaming call via model wrapper,
    // while leaving the streaming path to future agent steps. We still stream
    // a short typing indicator token to keep UI responsive.
    if (onToken) onToken('')

    // TODO: Replace with LangGraph graph: classifier → enrichment → planner → executor
    const model = createOpenAiChatModel({ apiKey: input.apiKey })
    const response = await model.generateText(input.messages)
    return response
  }
}

export const orchestrator = new Orchestrator()


