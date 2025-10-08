import { create } from 'zustand'
import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import { STORAGE_KEYS } from '../constants'
import { storageGet, storageSet } from '../utils/storage'

type ChatState = {
  isOpen: boolean
  messages: ChatMessage[]
  sending: boolean
  assistantDraft: string
  pendingPlan?: Plan | null
  setOpen: (open: boolean) => void
  addMessage: (msg: ChatMessage) => void
  startSending: () => void
  finishSending: () => void
  clear: () => void
  clearSession: () => void
  setAssistantDraft: (t: string) => void
  setPendingPlan: (p: Plan | null) => void
  loadMessages: () => Promise<void>
}

async function saveMessages(messages: ChatMessage[]): Promise<void>
{
  await storageSet(STORAGE_KEYS.CHAT_MESSAGES, messages)
}

async function loadStoredMessages(): Promise<ChatMessage[]>
{
  const messages = await storageGet<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES)
  return messages ?? []
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  messages: [],
  sending: false,
  assistantDraft: '',
  pendingPlan: null,
  setOpen: (open) => set({ isOpen: open }),
  addMessage: (msg) =>
  {
    set((s) =>
    {
      const newMessages = [...s.messages, msg]
      saveMessages(newMessages)
      return { messages: newMessages }
    })
  },
  startSending: () => set({ sending: true }),
  finishSending: () => set({ sending: false }),
  clear: () => set({ messages: [] }),
  clearSession: () =>
  {
    set({ messages: [], assistantDraft: '', pendingPlan: null, sending: false })
    saveMessages([])
  },
  setAssistantDraft: (t) => set({ assistantDraft: t }),
  setPendingPlan: (p) => set({ pendingPlan: p }),
  loadMessages: async () =>
  {
    const messages = await loadStoredMessages()
    set({ messages })
  }
}))
