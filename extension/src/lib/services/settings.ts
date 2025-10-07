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


