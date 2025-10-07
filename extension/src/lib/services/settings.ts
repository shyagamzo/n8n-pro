export async function getOpenAiKey(): Promise<string>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get(['openai_api_key'], (res) =>
    {
      resolve((res?.openai_api_key as string | undefined) ?? '')
    })
  })
}

export async function setOpenAiKey(key: string): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.set({ openai_api_key: key }, () => resolve())
  })
}

export async function clearOpenAiKey(): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.remove(['openai_api_key'], () => resolve())
  })
}


export async function getN8nApiKey(): Promise<string>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get(['n8n_api_key'], (res) =>
    {
      resolve((res?.n8n_api_key as string | undefined) ?? '')
    })
  })
}

export async function setN8nApiKey(key: string): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.set({ n8n_api_key: key }, () => resolve())
  })
}

export async function clearN8nApiKey(): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.remove(['n8n_api_key'], () => resolve())
  })
}


