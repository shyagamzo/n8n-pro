import { create } from 'zustand'
import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'

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

const STORAGE_KEY_MESSAGES = 'n8n-pro-chat-messages'

async function saveMessages(messages: ChatMessage[]): Promise<void>
{
  await chrome.storage.local.set({ [STORAGE_KEY_MESSAGES]: messages })
}

async function loadStoredMessages(): Promise<ChatMessage[]>
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get([STORAGE_KEY_MESSAGES], (result) =>
    {
      resolve(result[STORAGE_KEY_MESSAGES] || [])
    })
  })
}

export const useChatStore = create<ChatState>((set, get) => ({
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
