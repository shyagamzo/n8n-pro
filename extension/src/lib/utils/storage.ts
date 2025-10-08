/**
 * Unified storage utility for chrome.storage.local
 * Provides typed, promise-based API for storage operations
 */

/**
 * Get a value from chrome.storage.local
 */
export async function storageGet<T>(key: string): Promise<T | undefined>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get([key], (result) =>
    {
      resolve(result?.[key] as T | undefined)
    })
  })
}

/**
 * Get a string value from chrome.storage.local, returning empty string if not found
 */
export async function storageGetString(key: string): Promise<string>
{
  const value = await storageGet<string>(key)
  return value ?? ''
}

/**
 * Get multiple values from chrome.storage.local
 */
export async function storageGetMany<T extends Record<string, unknown>>(keys: string[]): Promise<Partial<T>>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get(keys, (result) =>
    {
      resolve(result as Partial<T>)
    })
  })
}

/**
 * Set a value in chrome.storage.local
 */
export async function storageSet<T>(key: string, value: T): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.set({ [key]: value }, () => resolve())
  })
}

/**
 * Set multiple values in chrome.storage.local
 */
export async function storageSetMany(items: Record<string, unknown>): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.set(items, () => resolve())
  })
}

/**
 * Remove a key from chrome.storage.local
 */
export async function storageRemove(key: string): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.remove([key], () => resolve())
  })
}

/**
 * Remove multiple keys from chrome.storage.local
 */
export async function storageRemoveMany(keys: string[]): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.remove(keys, () => resolve())
  })
}

/**
 * Clear all data from chrome.storage.local
 */
export async function storageClear(): Promise<void>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.clear(() => resolve())
  })
}

