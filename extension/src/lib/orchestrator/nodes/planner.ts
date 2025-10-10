import { Command } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { buildPrompt } from '../../prompts'
import { parse as parseLoom } from '../../loom'
import { stripCodeFences } from '../../utils/markdown'
import { loomToPlan } from '../plan-converter'
import { debugLLMResponse, debugLoomParsing, debugAgentDecision, type DebugSession } from '../../utils/debug'
import { plannerTools } from '../tools/planner'

/**
 * Planner node generates structured workflow plans in Loom format.
 * 
 * Features:
 * - Bound tools: fetch_n8n_node_types, get_node_docs
 * - Uses Loom protocol for efficient agent communication
 * - Integrates with narrator for progress updates
 * - Integrates with debug session for tracing
 * 
 * Flow:
 * 1. LLM generates workflow plan OR calls tools
 * 2. If tool calls: goto planner_tools node
 * 3. If plan generated: parse Loom → validate → goto validator
 */
export async function plannerNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  const apiKey = config?.configurable?.openai_api_key
  const modelName = config?.configurable?.model || 'gpt-4o-mini'
  const narrator = config?.metadata?.narrator
  const session = config?.metadata?.session as DebugSession | undefined

  if (!apiKey)
  {
    throw new Error('OpenAI API key not provided in config.configurable')
  }

  narrator?.post('planner', 'designing workflow', 'started')
  session?.log('Starting plan generation', { messageCount: state.messages.length })

  debugAgentDecision('planner', 'Starting workflow plan generation', 'Converting conversation to Loom format', {
    messageCount: state.messages.length
  })

  // Bind planner-specific tools
  const model = new ChatOpenAI({
    apiKey,
    model: modelName,
    temperature: 0.2
  }).bindTools(plannerTools)

  const systemPrompt = buildPrompt('planner', {
    includeNodesReference: true,
    includeWorkflowPatterns: true,
    includeConstraints: true
  })

  const planRequest = `Generate a workflow plan based on our conversation.
Return ONLY raw Loom format - no markdown code blocks, no explanatory text, just the pure Loom structure.

If you need to check what node types are available, use the fetch_n8n_node_types tool first.`

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
    new HumanMessage(planRequest)
  ])

  // Check if LLM called tools
  if ((response as AIMessage).tool_calls?.length)
  {
    debugAgentDecision('planner', 'Calling tools', 'Fetching n8n node information', {
      toolCount: (response as AIMessage).tool_calls?.length
    })

    // Route to planner_tools node
    return new Command({
      goto: 'planner_tools',
      update: {
        messages: [response]
      }
    })
  }

  // Parse Loom response
  const content = response.content as string
  debugLLMResponse(content, session?.getSessionId() || '')
  session?.log('LLM response received', { responseLength: content.length })

  const cleanedResponse = stripCodeFences(content)
  const parsed = parseLoom(cleanedResponse)

  if (!parsed.success || !parsed.data)
  {
    debugLoomParsing(cleanedResponse, parsed, false)
    session?.log('Loom parsing failed', { errors: parsed.errors })
    narrator?.post('planner', 'plan generation failed', 'error')

    throw new Error(
      'Failed to generate a valid workflow plan. ' +
      'The AI response could not be parsed. ' +
      'Please try rephrasing your request or providing more details.'
    )
  }

  debugLoomParsing(cleanedResponse, parsed.data, true)
  session?.log('Loom parsing succeeded')

  const plan = loomToPlan(parsed.data)

  debugAgentDecision('planner', 'Plan generated successfully', 'Converted Loom to workflow plan', {
    nodeCount: plan.workflow.nodes?.length || 0,
    credentialsNeeded: plan.credentialsNeeded?.length || 0
  })

  narrator?.post('planner', 'workflow design complete', 'complete')

  return new Command({
    goto: 'validator',
    update: {
      plan,
      messages: [response]
    }
  })
}

