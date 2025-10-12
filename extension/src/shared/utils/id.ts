export function generateId(): string
{
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // Fallback
  return 'id-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36)
}
