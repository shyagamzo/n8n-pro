import { STORAGE_KEYS } from '../constants'
import { storageGetString, storageSet, storageRemove } from '../utils/storage'
import { validateOpenAiKey, validateN8nKey, validateN8nBaseUrl } from '../utils/validation'
import { logger } from './logger'

export async function getOpenAiKey(): Promise<string>
{
  return storageGetString(STORAGE_KEYS.OPENAI_API_KEY)
}

export async function setOpenAiKey(key: string): Promise<void>
{
  // Validate key format before storing
  const validatedKey = validateOpenAiKey(key)
  logger.info('Storing OpenAI API key')
  return storageSet(STORAGE_KEYS.OPENAI_API_KEY, validatedKey)
}

export async function clearOpenAiKey(): Promise<void>
{
  return storageRemove(STORAGE_KEYS.OPENAI_API_KEY)
}

export async function getN8nApiKey(): Promise<string>
{
  return storageGetString(STORAGE_KEYS.N8N_API_KEY)
}

export async function setN8nApiKey(key: string): Promise<void>
{
  // Validate key format before storing
  const validatedKey = validateN8nKey(key)
  logger.info('Storing n8n API key')
  return storageSet(STORAGE_KEYS.N8N_API_KEY, validatedKey)
}

export async function clearN8nApiKey(): Promise<void>
{
  return storageRemove(STORAGE_KEYS.N8N_API_KEY)
}

export async function getBaseUrl(): Promise<string>
{
  return storageGetString(STORAGE_KEYS.N8N_BASE_URL)
}

export async function setBaseUrl(url: string): Promise<void>
{
  // Validate URL format before storing
  const validatedUrl = validateN8nBaseUrl(url)
  logger.info('Storing n8n base URL', { url: validatedUrl })
  return storageSet(STORAGE_KEYS.N8N_BASE_URL, validatedUrl)
}

export async function clearBaseUrl(): Promise<void>
{
  return storageRemove(STORAGE_KEYS.N8N_BASE_URL)
}


