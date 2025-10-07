import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import { createOpenAiChatModel } from '../ai/model'
import { buildPrompt } from '../prompts'

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
    // For now, use a general assistant prompt with n8n knowledge
    const systemPrompt = buildPrompt('planner', {
      includeNodesReference: true,
      includeConstraints: true,
    })
    
    // Prepend system message to conversation
    const messagesWithSystem: ChatMessage[] = [
      { id: 'system', role: 'system', text: systemPrompt },
      ...input.messages,
    ]
    
    const model = createOpenAiChatModel({ apiKey: input.apiKey })
    const response = await model.generateText(messagesWithSystem)
    return response
  }

  public async plan(): Promise<Plan>
  {
    // MVP plan: create a simple workflow with a manual trigger and a code node
    return {
      title: 'Create simple workflow',
      summary: 'Manual trigger followed by a Code node that returns a greeting.',
      credentialsNeeded: [],
      workflow: {
        name: 'Demo workflow',
        nodes: [
          { id: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', name: 'Manual Trigger', parameters: {} },
          { id: 'Code', type: 'n8n-nodes-base.code', name: 'Code', parameters: { language: 'javascript', functionCode: 'return [{ greeting: "Hello from n8n" }];' } },
        ],
        connections: {
          'Manual Trigger': {
            main: [ [ { node: 'Code', type: 'main', index: 0 } ] ]
          }
        }
      }
    }
  }
}

export const orchestrator = new Orchestrator()


