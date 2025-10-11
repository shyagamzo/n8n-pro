import { Command } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { buildPrompt } from '../../prompts'
import { parse as parseLoom } from '../../loom'
import { stripCodeFences } from '../../utils/markdown'
import { loomToPlan } from '../plan-converter'
import { type DebugSession } from '../../utils/debug'
import { plannerTools } from '../tools/planner'
import { createValidatorTool } from '../tools/validator-tool'
import { systemEvents } from '../../events'

/**
 * Planner node generates structured workflow plans in Loom format.
 *
 * Uses createReactAgent for automatic tool loop handling:
 * - Bound tools: fetch_n8n_node_types, get_node_docs
 * - ReAct agent handles tool calls internally (no separate tool node needed)
 * - Uses Loom protocol for efficient agent communication
 * - Integrates with narrator for progress updates
 * - Integrates with debug session for tracing
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

  // Create ReAct agent with planner tools (including validator tool with API key from closure)
  const systemPrompt = buildPrompt('planner', {
    includeNodesReference: true,
    includeWorkflowPatterns: true,
    includeConstraints: true
  })

  // Create validator tool with API key from closure (secure, not passed as parameter)
  const validatorTool = createValidatorTool(apiKey, modelName)

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.2
    }),
    tools: [...plannerTools, validatorTool],
    messageModifier: systemPrompt
  })

  const planRequest = new HumanMessage(`Generate a workflow plan based on our conversation.

Process:
1. If needed, use fetch_n8n_node_types to check available nodes
2. Design the workflow in Loom format
3. Use the validate_workflow tool to validate your design (pass only loomWorkflow parameter)
4. If validation fails, read the errors and correctedWorkflow, then fix the issues
5. Validate again until it passes
6. Once validated, return ONLY the final raw Loom format - no markdown code blocks, no explanatory text

Important: Always validate before finalizing. The validator will tell you what's wrong and provide corrections.`)

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

