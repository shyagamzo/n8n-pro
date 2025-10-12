import { Command } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '@ai/orchestrator/state'
import { buildPrompt, buildRequest } from '@ai/prompts'
import { parse as parseLoom } from '@loom'
import { stripCodeFences } from '@shared/utils/markdown'
import { loomToPlan } from '@ai/orchestrator/plan-converter'
import { type DebugSession } from '@shared/utils/debug'
import { plannerTools } from '@ai/orchestrator/tools/planner'
import { validateWorkflowTool } from '@ai/orchestrator/tools/validator-tool'
import { systemEvents } from '@events'

/**
 * Planner node generates structured workflow plans in Loom format.
 *
 * Uses createReactAgent for automatic tool loop handling:
 * - Bound tools: fetch_n8n_node_types, get_node_docs
 * - ReAct agent handles tool calls internally (no separate tool node needed)
 * - Uses Loom protocol for efficient agent communication
 * - Events automatically emitted by LangGraph bridge (agent lifecycle, LLM calls)
 * - Integrates with debug session for detailed tracing
 *
 * Flow:
 * 1. ReAct agent generates workflow plan (calls tools as needed internally)
 * 2. Parse Loom response → convert to plan → goto validator
 */
export async function plannerNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  const apiKey = config?.configurable?.openai_api_key
  const modelName = config?.configurable?.model || 'gpt-4o-mini'
  const session = config?.metadata?.session as DebugSession | undefined

  if (!apiKey)
  {
    throw new Error('OpenAI API key not provided in config.configurable')
  }

  session?.log('Starting plan generation', { messageCount: state.messages.length })

  // Agent lifecycle events are automatically emitted by LangGraph bridge
  // (on_chain_start → emitAgentStarted('planner', 'planning'))

  // Create ReAct agent with planner tools (including validator tool)
  const systemPrompt = buildPrompt('planner', {
    includeNodesReference: true,
    includeWorkflowPatterns: true,
    includeConstraints: true
  })

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.2,
      streaming: false  // Planner works silently - no token streaming to user
    }),
    tools: [...plannerTools, validateWorkflowTool],
    messageModifier: systemPrompt
  })

  const planRequest = new HumanMessage(buildRequest('planner'))

  // ReAct agent handles tool loop internally
  const result = await agent.invoke(
    { messages: [...state.messages, planRequest] },
    config
  )

  // Extract final response from agent
  const lastMessage = result.messages[result.messages.length - 1]
  const content = lastMessage.content as string

  session?.log('LLM response received', { responseLength: content.length })

  // Parse Loom response
  const cleanedResponse = stripCodeFences(content)
  const parsed = parseLoom(cleanedResponse)

  if (!parsed.success || !parsed.data)
  {
    session?.log('Loom parsing failed', { errors: parsed.errors })

    // Emit validation error event
    systemEvents.emit({
      domain: 'error',
      type: 'validation',
      payload: {
        error: new Error('Loom parsing failed'),
        source: 'planner',
        context: { response: cleanedResponse, errors: parsed.errors }
      },
      timestamp: Date.now()
    })

    throw new Error(
      'Failed to generate a valid workflow plan. ' +
      'The AI response could not be parsed. ' +
      'Please try rephrasing your request or providing more details.'
    )
  }

  session?.log('Loom parsing succeeded')

  const plan = loomToPlan(parsed.data)
  session?.log('Plan converted', {
    nodeCount: plan.workflow.nodes?.length || 0,
    credentialsNeeded: plan.credentialsNeeded?.length || 0
  })

  // Agent completion event automatically emitted by LangGraph bridge
  // (on_chain_end → emitAgentCompleted('planner'))

  // Planner now validates internally via tool, go directly to executor
  return new Command({
    goto: 'executor',
    update: {
      plan,
      messages: result.messages
    }
  })
}

