import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import { createOpenAiChatModel } from '../ai/model'
import { buildPrompt } from '../prompts'
import { parse as parseLoom } from '../loom'
import { streamChatCompletion } from '../services/openai'
import { stripCodeFences } from '../utils/markdown'

export type OrchestratorInput = {
  apiKey: string
  messages: ChatMessage[]
  availableCredentials?: Array<{ id: string; name: string; type: string }>
}

export type StreamTokenHandler = (token: string) => void

class Orchestrator
{
  public async handle(input: OrchestratorInput, onToken?: StreamTokenHandler): Promise<string>
  {
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

    // Stream the response token by token to the UI
    if (onToken)
    {
      await streamChatCompletion(
        input.apiKey,
        messagesWithSystem,
        onToken
      )
    }
    else
    {
      // Fallback to blocking call if no streaming callback provided
      const model = createOpenAiChatModel({ apiKey: input.apiKey })
      return await model.generateText(messagesWithSystem)
    }

    return ''
  }

  public async plan(input: OrchestratorInput): Promise<Plan>
  {
    // Build context for planner
    const context: Record<string, unknown> = {}

    if (input.availableCredentials && input.availableCredentials.length > 0)
    {
      // Pass full credential objects so planner can see names, types, and IDs
      context.availableCredentials = input.availableCredentials
    }

    // Build planner prompt with context
    const systemPrompt = buildPrompt('planner', {
      includeNodesReference: true,
      includeWorkflowPatterns: true,
      includeConstraints: true,
      context,
    })

    // Create request asking for workflow plan
    const planRequest: ChatMessage = {
      id: 'plan-request',
      role: 'user',
      text: 'Generate a workflow plan based on our conversation. Output in Loom format.',
    }

    // Prepend system message and append plan request
    const messagesWithSystem: ChatMessage[] = [
      { id: 'system', role: 'system', text: systemPrompt },
      ...input.messages,
      planRequest,
    ]

    // Call LLM to generate plan
    const model = createOpenAiChatModel({ apiKey: input.apiKey })
    const loomResponse = await model.generateText(messagesWithSystem)

    // Parse Loom response into Plan object
    try
    {
      // Strip markdown code fences if present (LLM sometimes wraps response in ```)
      const cleanedResponse = stripCodeFences(loomResponse)

      const parsed = parseLoom(cleanedResponse)

      if (!parsed.success || !parsed.data)
      {
        throw new Error('Failed to parse Loom response: ' + parsed.errors.map(e => e.message).join(', '))
      }

      // Convert parsed Loom to Plan type
      const plan = this.loomToPlan(parsed.data)
      return plan
    }
    catch (error)
    {
      console.error('Plan parsing error:', error)
      console.error('LLM response:', loomResponse)

      // Fallback to a basic plan
      return this.fallbackPlan(input.messages)
    }
  }

  private loomToPlan(loomData: Record<string, unknown>): Plan
  {
    // Extract fields from Loom data
    const title = String(loomData.title || 'Workflow')
    const summary = String(loomData.summary || 'Generated workflow')
    const credentialsNeeded = (loomData.credentialsNeeded as Array<unknown> || []).map(cred =>
    {
      const c = cred as Record<string, unknown>
      return {
        type: String(c.type || ''),
        name: c.name ? String(c.name) : undefined,
        requiredFor: c.requiredFor ? String(c.requiredFor) : undefined,
        nodeId: c.nodeId ? String(c.nodeId) : undefined,
        nodeName: c.nodeName ? String(c.nodeName) : undefined,
      }
    })

    const credentialsAvailable = (loomData.credentialsAvailable as Array<unknown> || []).map(cred =>
    {
      const c = cred as Record<string, unknown>
      return {
        type: String(c.type || ''),
        name: c.name ? String(c.name) : undefined,
        requiredFor: c.status ? String(c.status) : undefined,
      }
    })

    const workflow = loomData.workflow as Record<string, unknown> || {}

    return {
      title,
      summary,
      credentialsNeeded,
      credentialsAvailable: credentialsAvailable.length > 0 ? credentialsAvailable : undefined,
      workflow: {
        name: String(workflow.name || title),
        nodes: (workflow.nodes as unknown[]) || [],
        connections: (workflow.connections as Record<string, unknown>) || {},
      },
    }
  }

  private fallbackPlan(messages: ChatMessage[]): Plan
  {
    // Extract intent from last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    const userIntent = lastUserMessage?.text || 'workflow'

    return {
      title: 'Simple Workflow',
      summary: `Basic workflow for: ${userIntent.slice(0, 100)}`,
      credentialsNeeded: [],
      workflow: {
        name: 'Fallback Workflow',
        nodes: [
          {
            id: 'manual-trigger',
            type: 'n8n-nodes-base.manualTrigger',
            name: 'When clicking "Execute Workflow"',
            parameters: {},
            position: [250, 300],
          },
          {
            id: 'code',
            type: 'n8n-nodes-base.code',
            name: 'Process Data',
            parameters: {
              language: 'javascript',
              jsCode: 'return [{ message: "Please refine your request for a more specific workflow" }];',
            },
            position: [450, 300],
          },
        ],
        connections: {
          'manual-trigger': {
            main: [[{ node: 'code', type: 'main', index: 0 }]],
          },
        },
      },
    }
  }
}

export const orchestrator = new Orchestrator()


