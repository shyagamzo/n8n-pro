import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import type { DebugSession } from '../utils/debug'

/**
 * Debug callback handler integrates LangChain execution with our debug infrastructure.
 * 
 * Captures chain/node execution, LLM calls, and tool executions to provide
 * comprehensive tracing for development and debugging.
 * 
 * Usage:
 * ```typescript
 * const session = new DebugSession('Orchestrator', 'plan')
 * const handler = new DebugCallbackHandler(session)
 * 
 * const result = await graph.invoke(input, {
 *   callbacks: [handler]
 * })
 * 
 * session.end(true)
 * ```
 */
export class DebugCallbackHandler extends BaseCallbackHandler
{
  name = 'debug_callback_handler'

  constructor(private session: DebugSession)
  {
    super()
  }

  /**
   * Called when a chain/node starts execution.
   */
  async handleChainStart(chain: any, inputs: any): Promise<void>
  {
    const nodeName = chain?.name || 'unknown'
    this.session.log(`Node started: ${nodeName}`, {
      inputs: this.sanitize(inputs)
    })
  }

  /**
   * Called when a chain/node completes execution.
   */
  async handleChainEnd(chain: any, outputs: any): Promise<void>
  {
    const nodeName = chain?.name || 'unknown'
    this.session.log(`Node completed: ${nodeName}`, {
      outputs: this.sanitize(outputs)
    })
  }

  /**
   * Called when a chain/node encounters an error.
   */
  async handleChainError(error: Error, chain: any): Promise<void>
  {
    const nodeName = chain?.name || 'unknown'
    this.session.log(`Node error: ${nodeName}`, {
      error: error.message,
      stack: error.stack
    })
  }

  /**
   * Called when an LLM call starts.
   */
  async handleLLMStart(llm: any, prompts: string[]): Promise<void>
  {
    this.session.log('LLM call started', {
      promptCount: prompts.length,
      firstPromptLength: prompts[0]?.length || 0
    })
  }

  /**
   * Called when an LLM call completes.
   */
  async handleLLMEnd(llm: any, output: any): Promise<void>
  {
    const responseText = output?.generations?.[0]?.[0]?.text || ''
    this.session.log('LLM call completed', {
      responseLength: responseText.length
    })
  }

  /**
   * Called when an LLM call encounters an error.
   */
  async handleLLMError(error: Error): Promise<void>
  {
    this.session.log('LLM call error', {
      error: error.message
    })
  }

  /**
   * Called when a tool execution starts.
   */
  async handleToolStart(tool: any, input: string): Promise<void>
  {
    this.session.log(`Tool started: ${tool.name}`, {
      input: this.sanitize(input)
    })
  }

  /**
   * Called when a tool execution completes.
   */
  async handleToolEnd(tool: any, output: string): Promise<void>
  {
    this.session.log(`Tool completed: ${tool.name}`, {
      outputLength: output.length
    })
  }

  /**
   * Called when a tool execution encounters an error.
   */
  async handleToolError(error: Error, tool: any): Promise<void>
  {
    this.session.log(`Tool error: ${tool.name}`, {
      error: error.message
    })
  }

  /**
   * Sanitize data for logging (remove sensitive info, truncate long values).
   */
  private sanitize(data: any): any
  {
    if (typeof data === 'string')
    {
      // Truncate long strings
      if (data.length > 500)
      {
        return data.substring(0, 500) + '... (truncated)'
      }
      return data
    }

    if (Array.isArray(data))
    {
      return data.map(item => this.sanitize(item))
    }

    if (data && typeof data === 'object')
    {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data))
      {
        // Skip sensitive fields
        if (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('password'))
        {
          sanitized[key] = '[REDACTED]'
        }
        else
        {
          sanitized[key] = this.sanitize(value)
        }
      }
      return sanitized
    }

    return data
  }
}

