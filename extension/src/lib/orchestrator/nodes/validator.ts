import { Command } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'

import type { OrchestratorStateType } from '../state'
import { buildPrompt } from '../../prompts'
import { parse as parseLoom } from '../../loom'
import { stripCodeFences } from '../../utils/markdown'
import { loomToPlan } from '../plan-converter'
import { format as formatLoom } from '../../loom'
import { debugAgentDecision, type DebugSession } from '../../utils/debug'

/**
 * Validator node performs LLM-based validation of workflow plans.
 *
 * Uses createReactAgent for consistent agent pattern:
 * - No tools - relies on LLM's knowledge of n8n schemas and patterns
 * - ReAct agent for validation consistency
 * - This is intentional: LLMs are trained on n8n documentation and can validate
 *   without needing custom validation code
 *
 * Features:
 * - Pure LLM validation using n8n knowledge
 * - Auto-fixes errors by extracting corrected Loom
 * - No structural validation code
 *
 * Flow:
 * 1. ReAct agent validates the plan
 * 2. If valid: goto executor
 * 3. If invalid: extract corrected plan → goto executor with corrected plan
 */
export async function validatorNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  if (!state.plan)
  {
    throw new Error('No plan to validate')
  }

  const apiKey = config?.configurable?.openai_api_key
  const modelName = config?.configurable?.model || 'gpt-4o-mini'
  const narrator = config?.metadata?.narrator as any
  const session = config?.metadata?.session as DebugSession | undefined

  if (!apiKey)
  {
    throw new Error('OpenAI API key not provided in config.configurable')
  }

  narrator?.post('validator', 'validating workflow', 'started')
  session?.log('Starting workflow validation')

  debugAgentDecision('validator', 'Validating workflow plan', 'Using ReAct agent with LLM n8n knowledge', {
    nodeCount: state.plan.workflow.nodes?.length || 0
  })

  // Create ReAct agent (no tools, pure LLM validation)
  const systemPrompt = buildPrompt('validator', {
    includeNodesReference: true,
    includeConstraints: true
  })

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.1  // Low temperature for consistent validation
    }),
    tools: [],  // No tools - pure LLM validation
    messageModifier: new SystemMessage(systemPrompt)
  })

  // Convert plan to Loom for validation
  const loomRepresentation = formatLoom(state.plan)

  const validationPrompt = new HumanMessage(`Validate this n8n workflow plan for correctness.

Workflow Plan (Loom format):
${loomRepresentation}

Check for:
1. Node types are valid n8n node types (correct package.nodeName format, e.g. "n8n-nodes-base.slack")
2. Required parameters are present for each node type
3. Connections reference existing node names
4. Trigger nodes are appropriate (scheduleTrigger, webhook, manualTrigger, etc.)
5. Credentials are correctly specified where needed

Response format:
- If the workflow is VALID, respond with: [VALID]
- If there are ERRORS, respond with: [INVALID]
  Then list each error clearly, and provide a CORRECTED version of the workflow in Loom format.`)

  // ReAct agent validates the plan
  const result = await agent.invoke(
    { messages: [validationPrompt] },
    config
  )

  const lastMessage = result.messages[result.messages.length - 1]
  const content = lastMessage.content as string

  // Check validation result
  if (content.includes('[VALID]'))
  {
    session?.log('Workflow validation passed')
    narrator?.post('validator', 'validation complete', 'complete')

    debugAgentDecision('validator', 'Validation passed', 'Workflow is n8n-compatible')

    return new Command({
      goto: 'executor',
      update: {}
    })
  }

  // Validation failed, attempt to extract corrected plan
  if (content.includes('[INVALID]'))
  {
    session?.log('Workflow validation failed, attempting auto-fix')

    debugAgentDecision('validator', 'Validation failed', 'Extracting corrected plan from LLM response', {
      responseLength: content.length
    })

    // Extract corrected Loom from response
    const correctedLoom = extractLoomFromResponse(content)

    if (correctedLoom)
    {
      const parsed = parseLoom(correctedLoom)

      if (parsed.success && parsed.data)
      {
        const correctedPlan = loomToPlan(parsed.data)

        session?.log('Validation auto-fix successful')
        narrator?.post('validator', 'workflow corrected', 'complete')

        debugAgentDecision('validator', 'Auto-fixed validation errors', 'Applied LLM corrections', {
          originalNodeCount: state.plan.workflow.nodes?.length || 0,
          correctedNodeCount: correctedPlan.workflow.nodes?.length || 0
        })

        // Proceed with corrected plan
        return new Command({
          goto: 'executor',
          update: { plan: correctedPlan }
        })
      }
    }

    // If we can't parse the corrected version, fail
    session?.log('Validation auto-fix failed')
    narrator?.post('validator', 'validation failed', 'error')

    throw new Error('Workflow validation failed and could not be automatically corrected.\n\n' + content)
  }

  // Unexpected response
  throw new Error('Unexpected validation response from LLM: ' + content)
}

/**
 * Extract Loom format from validator response.
 * Looks for corrected workflow after error explanation.
 */
function extractLoomFromResponse(response: string): string | null
{
  // Look for Loom block after "CORRECTED" or similar markers
  const loomMatch = response.match(/(?:corrected|fixed).*?:?\s*\n([\s\S]+?)(?:\n\n|$)/i)
  if (loomMatch)
  {
    return stripCodeFences(loomMatch[1].trim())
  }

  // Try to extract any Loom-like structure (starts with key:value pattern)
  const lines = response.split('\n')
  const loomStart = lines.findIndex(line => /^[a-zA-Z_][a-zA-Z0-9_]*:/.test(line.trim()))
  if (loomStart !== -1)
  {
    return lines.slice(loomStart).join('\n')
  }

  return null
}

