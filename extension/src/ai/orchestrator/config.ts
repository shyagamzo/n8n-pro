/**
 * Configuration extraction utilities for LangGraph nodes.
 * Extracts OpenAI and n8n configuration from RunnableConfig.configurable.
 */

import type { RunnableConfig } from '@langchain/core/runnables'

// ==========================================
// Constants
// ==========================================

const DEFAULT_MODEL = 'gpt-4o-mini'

// ==========================================
// Type Definitions
// ==========================================

export type OpenAIConfig = {
  apiKey: string
  modelName: string
}

export type ExecutorConfig = {
  apiKey: string
  modelName: string
  n8nApiKey: string
  n8nBaseUrl: string
}

// ==========================================
// Configuration Extractors
// ==========================================

/**
 * Extract OpenAI configuration for enrichment, planner, and validator nodes
 */
export function extractOpenAIConfig(config?: RunnableConfig): OpenAIConfig
{
  const apiKey = config?.configurable?.openai_api_key
  const modelName = config?.configurable?.model || DEFAULT_MODEL

  if (!apiKey)
  {
    throw new Error('OpenAI API key not provided in config.configurable')
  }

  return { apiKey, modelName }
}

/**
 * Extract full configuration for executor node (includes n8n API config)
 */
export function extractExecutorConfig(config?: RunnableConfig): ExecutorConfig
{
  const openAIConfig = extractOpenAIConfig(config)
  const n8nApiKey = config?.configurable?.n8n_api_key
  const n8nBaseUrl = config?.configurable?.n8n_base_url

  if (!n8nApiKey)
  {
    throw new Error('n8n API key not provided in config.configurable')
  }

  return {
    ...openAIConfig,
    n8nApiKey,
    n8nBaseUrl: n8nBaseUrl || ''
  }
}

