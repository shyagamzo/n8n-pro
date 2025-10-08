/**
 * Agent tracing using LangChain callbacks
 *
 * Provides automatic tracing of agent communication, LLM calls,
 * and decision handoffs using LangChain's BaseCallbackHandler.
 */

import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import type { Serialized } from '@langchain/core/load/serializable'
import type { LLMResult } from '@langchain/core/outputs'
import type { AgentType, AgentTrace, AgentDecision, AgentHandoff } from '../types/messaging'

/**
 * Agent tracing callback handler for LangChain
 *
 * Captures LLM calls, agent decisions, and handoffs automatically
 * when attached to LangChain models and chains.
 */
export class AgentTracingCallback extends BaseCallbackHandler
{
  name = 'agent_tracing_callback'

  private traces: Map<string, AgentTrace> = new Map()
  private currentAgent: AgentType = 'orchestrator'
  private currentTraceId: string
  private llmStartTimes: Map<string, number> = new Map()

  constructor(traceId?: string, sessionId?: string)
  {
    super()
    this.currentTraceId = traceId || `trace-${Date.now()}`

    // Initialize trace
    const trace: AgentTrace = {
      traceId: this.currentTraceId,
      sessionId: sessionId || `session-${Date.now()}`,
      startTime: Date.now(),
      decisions: [],
      handoffs: [],
      llmCalls: [],
    }
    this.traces.set(this.currentTraceId, trace)
  }

  /**
   * Set the current agent context for subsequent operations
   */
  public setAgent(agent: AgentType): void
  {
    this.currentAgent = agent
  }

  /**
   * Log an agent decision
   */
  public logDecision(decision: string, reasoning?: string, metadata?: Record<string, unknown>): void
  {
    const trace = this.traces.get(this.currentTraceId)
    if (!trace) return

    const agentDecision: AgentDecision = {
      agent: this.currentAgent,
      decision,
      reasoning,
      timestamp: Date.now(),
      metadata,
    }

    trace.decisions.push(agentDecision)

    // Console output for development
    if (process.env.NODE_ENV === 'development')
    {
      console.info(
        `%c🤖 [${this.currentAgent.toUpperCase()}] Decision`,
        'color: #10b981; font-weight: bold',
        decision,
        reasoning ? `\n   Reasoning: ${reasoning}` : ''
      )
    }
  }

  /**
   * Log an agent handoff
   */
  public logHandoff(to: AgentType, reason: string, context?: Record<string, unknown>): void
  {
    const trace = this.traces.get(this.currentTraceId)
    if (!trace) return

    const handoff: AgentHandoff = {
      from: this.currentAgent,
      to,
      reason,
      context,
      timestamp: Date.now(),
    }

    trace.handoffs.push(handoff)

    // Console output for development
    if (process.env.NODE_ENV === 'development')
    {
      console.info(
        `%c🔄 [${this.currentAgent.toUpperCase()} → ${to.toUpperCase()}]`,
        'color: #f59e0b; font-weight: bold',
        reason,
        context ? context : ''
      )
    }

    // Update current agent
    this.currentAgent = to
  }

  /**
   * LangChain callback: LLM start
   */
  override async handleLLMStart(
    llm: Serialized,
    _prompts: string[],
    runId: string
  ): Promise<void>
  {
    this.llmStartTimes.set(runId, Date.now())

    if (process.env.NODE_ENV === 'development')
    {
      const modelName = llm.id?.[llm.id.length - 1] || 'unknown'
      console.info(
        `%c🧠 [${this.currentAgent.toUpperCase()}] LLM Start`,
        'color: #8b5cf6; font-weight: bold',
        modelName
      )
    }
  }

  /**
   * LangChain callback: LLM end
   */
  override async handleLLMEnd(
    output: LLMResult,
    runId: string
  ): Promise<void>
  {
    const trace = this.traces.get(this.currentTraceId)
    if (!trace) return

    const startTime = this.llmStartTimes.get(runId)
    const durationMs = startTime ? Date.now() - startTime : 0
    this.llmStartTimes.delete(runId)

    const llmCall = {
      agent: this.currentAgent,
      model: output.llmOutput?.model_name || 'unknown',
      promptTokens: output.llmOutput?.tokenUsage?.promptTokens,
      completionTokens: output.llmOutput?.tokenUsage?.completionTokens,
      durationMs,
      timestamp: Date.now(),
    }

    trace.llmCalls.push(llmCall)

    if (process.env.NODE_ENV === 'development')
    {
      const tokens = llmCall.promptTokens && llmCall.completionTokens
        ? ` (${llmCall.promptTokens}→${llmCall.completionTokens} tokens)`
        : ''
      console.info(
        `%c✅ [${this.currentAgent.toUpperCase()}] LLM Complete`,
        'color: #10b981; font-weight: bold',
        `${durationMs}ms${tokens}`
      )
    }
  }

  /**
   * LangChain callback: LLM error
   */
  override async handleLLMError(
    err: Error,
    runId: string
  ): Promise<void>
  {
    this.llmStartTimes.delete(runId)

    if (process.env.NODE_ENV === 'development')
    {
      console.error(
        `%c❌ [${this.currentAgent.toUpperCase()}] LLM Error`,
        'color: #ef4444; font-weight: bold',
        err.message
      )
    }
  }

  /**
   * Get the current trace
   */
  public getTrace(): AgentTrace | undefined
  {
    return this.traces.get(this.currentTraceId)
  }

  /**
   * Complete the trace and log summary
   */
  public completeTrace(): AgentTrace | undefined
  {
    const trace = this.traces.get(this.currentTraceId)
    if (!trace) return undefined

    trace.endTime = Date.now()
    const totalDuration = trace.endTime - trace.startTime

    if (process.env.NODE_ENV === 'development')
    {
      /* eslint-disable no-console */
      console.group(
        `%c📊 [TRACE] ${trace.traceId}`,
        'color: #3b82f6; font-weight: bold; font-size: 14px'
      )
      console.info(`%cDuration: ${totalDuration}ms`, 'color: #6b7280')
      console.info(`%cDecisions: ${trace.decisions.length}`, 'color: #10b981')
      console.info(`%cHandoffs: ${trace.handoffs.length}`, 'color: #f59e0b')
      console.info(`%cLLM Calls: ${trace.llmCalls.length}`, 'color: #8b5cf6')

      if (trace.handoffs.length > 0)
      {
        console.info('%cAgent Flow:', 'color: #6366f1; font-weight: bold')
        const flow = this.buildAgentFlow(trace)
        console.info(`   ${flow}`)
      }

      if (trace.llmCalls.length > 0)
      {
        const totalTokens = trace.llmCalls.reduce(
          (sum, call) => sum + (call.promptTokens || 0) + (call.completionTokens || 0),
          0
        )
        const totalLlmTime = trace.llmCalls.reduce((sum, call) => sum + call.durationMs, 0)
        console.info(`%cTotal Tokens: ${totalTokens}`, 'color: #8b5cf6')
        console.info(`%cTotal LLM Time: ${totalLlmTime}ms`, 'color: #8b5cf6')
      }

      console.groupEnd()
      /* eslint-enable no-console */
    }

    return trace
  }

  /**
   * Build agent flow visualization
   */

  private buildAgentFlow(trace: AgentTrace): string
  {
    if (trace.handoffs.length === 0)
    {
      return 'No handoffs'
    }

    const agents: AgentType[] = [trace.handoffs[0].from]

    for (const handoff of trace.handoffs)
    {
      agents.push(handoff.to)
    }

    return agents.map(a => a.toUpperCase()).join(' → ')
  }
}

/**
 * Create a new agent tracing callback
 */
export function createAgentTracer(sessionId?: string): AgentTracingCallback
{
  return new AgentTracingCallback(undefined, sessionId)
}

