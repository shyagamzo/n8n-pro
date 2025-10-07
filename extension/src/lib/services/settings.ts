const OPENAI_KEY = 'openai_api_key'
const N8N_KEY = 'n8n_api_key'

async function getStorageString(key: string): Promise<string>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get([key], (res) =>
    {
      resolve((res?.[key] as string | undefined) ?? '')
    })
  })
}

async function setStorageString(key: string, value: string): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.set({ [key]: value }, () => resolve())
  })
}

async function clearStorageKey(key: string): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.remove([key], () => resolve())
  })
}

export async function getOpenAiKey(): Promise<string>
{
  return getStorageString(OPENAI_KEY)
}

export async function setOpenAiKey(key: string): Promise<void>
{
  return setStorageString(OPENAI_KEY, key)
}

export async function clearOpenAiKey(): Promise<void>
{
  return clearStorageKey(OPENAI_KEY)
}

export async function getN8nApiKey(): Promise<string>
{
  return getStorageString(N8N_KEY)
}

export async function setN8nApiKey(key: string): Promise<void>
{
  return setStorageString(N8N_KEY, key)
}

export async function clearN8nApiKey(): Promise<void>
{
  return clearStorageKey(N8N_KEY)
}


