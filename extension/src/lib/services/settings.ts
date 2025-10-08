import { STORAGE_KEYS } from '../constants'
import { storageGetString, storageSet, storageRemove } from '../utils/storage'

export async function getOpenAiKey(): Promise<string>
{
  return storageGetString(STORAGE_KEYS.OPENAI_API_KEY)
}

export async function setOpenAiKey(key: string): Promise<void>
{
  return storageSet(STORAGE_KEYS.OPENAI_API_KEY, key)
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
  return storageSet(STORAGE_KEYS.N8N_API_KEY, key)
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
  return storageSet(STORAGE_KEYS.N8N_BASE_URL, url)
}

export async function clearBaseUrl(): Promise<void>
{
  return storageRemove(STORAGE_KEYS.N8N_BASE_URL)
}


