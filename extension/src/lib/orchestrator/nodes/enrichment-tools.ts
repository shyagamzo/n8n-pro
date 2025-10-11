import { Command } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { OrchestratorStateType } from '../state'
import { enrichmentCommandTools } from '../tools/enrichment-commands'
import { debugAgentDecision } from '../../utils/debug'

/**
 * Enrichment tools processing node.
 * 
 * Handles tool calls from the enrichment agent and updates system state accordingly.
 * Uses LangChain's ToolNode for execution and then processes the results.
 */
export async function enrichmentToolsNode(
  state: OrchestratorStateType,
  config?: RunnableConfig
): Promise<Command>
{
  debugAgentDecision(
    'enrichment_tools',
    'Processing tools',
    'Executing enrichment command tools',
    { messageCount: state.messages.length }
  )

  // Use LangChain's ToolNode to execute the tools
  const toolNode = new ToolNode(enrichmentCommandTools)
  const result = await toolNode.invoke(
    { messages: state.messages },
    config
  )

  debugAgentDecision(
    'enrichment_tools',
    'Tools executed',
    'Processing tool results',
    { resultCount: result.messages.length }
  )

  // Extract the last message which should contain tool results
  const previousMessage = state.messages[state.messages.length - 1]
  
  // Process tool calls from the previous message to update state
  const stateUpdates: Partial<OrchestratorStateType> = {
    messages: result.messages
  }

  if ((previousMessage as any).tool_calls) {
    for (const toolCall of (previousMessage as any).tool_calls) {
      switch (toolCall.name) {
        case 'reportRequirementsStatus':
          const args = toolCall.args as { hasAllRequiredInfo: boolean; confidence: number; missingInfo?: string[] }
          stateUpdates.hasAllRequiredInfo = args.hasAllRequiredInfo
          stateUpdates.confidence = args.confidence
          stateUpdates.missingInfo = args.missingInfo || []
          
          debugAgentDecision(
            'enrichment_tools',
            'Requirements status reported',
            `Has all info: ${args.hasAllRequiredInfo}, confidence: ${args.confidence}`,
            { args }
          )
          break
          
        case 'setConfidence':
          const confidenceArgs = toolCall.args as { confidence: number; reasoning?: string }
          stateUpdates.confidence = confidenceArgs.confidence
          
          debugAgentDecision(
            'enrichment_tools',
            'Confidence set',
            `Confidence: ${confidenceArgs.confidence}`,
            { reasoning: confidenceArgs.reasoning }
          )
          break
      }
    }
  }

  debugAgentDecision(
    'enrichment_tools',
    'State updated',
    'Returning to enrichment for final response',
    { stateUpdates: Object.keys(stateUpdates) }
  )

  // Always return to enrichment after processing tools
  // The enrichment node will then decide the next route based on updated state
  return new Command({
    goto: 'enrichment',
    update: stateUpdates
  })
}
