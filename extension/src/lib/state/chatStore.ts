import { create } from 'zustand'
import type { ChatMessage } from '../types/chat'
import type { Plan } from '../types/plan'
import type { ToastProps } from '../components/Toast'
import type { AgentType } from '../types/messaging'
import { STORAGE_KEYS } from '../constants'
import { storageGet, storageSet } from '../utils/storage'

export type AgentActivity = {
  id: string
  agent: AgentType
  activity: string
  status: 'started' | 'working' | 'complete' | 'error'
  timestamp: number
}

type ChatState = {
  isOpen: boolean
  messages: ChatMessage[]
  sending: boolean
  assistantDraft: string
  pendingPlan?: Plan | null
  activities: AgentActivity[]
  toasts: ToastProps[]
  setOpen: (open: boolean) => void
  addMessage: (msg: ChatMessage) => void
  startSending: () => void
  finishSending: () => void
  clear: () => void
  clearSession: () => void
  setAssistantDraft: (t: string) => void
  setPendingPlan: (p: Plan | null) => void
  addActivity: (activity: AgentActivity) => void
  updateActivity: (id: string, updates: Partial<AgentActivity>) => void
  removeActivity: (id: string) => void
  clearActivities: () => void
  addToast: (toast: Omit<ToastProps, 'onClose'>) => void
  removeToast: (id: string) => void
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
  activities: [],
  toasts: [],
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
  finishSending: () => set({ sending: false, activities: [] }),
  clear: () => set({ messages: [] }),
  clearSession: () =>
  {
    set({ messages: [], assistantDraft: '', pendingPlan: null, sending: false, activities: [] })
    saveMessages([])
  },
  setAssistantDraft: (t) => set({ assistantDraft: t }),
  setPendingPlan: (p) => set({ pendingPlan: p }),
  addActivity: (activity) =>
  {
    set((s) => ({
      activities: [...s.activities, activity]
    }))

    // Auto-remove completed activities after 3 seconds
    if (activity.status === 'complete')
    {
      setTimeout(() =>
      {
        useChatStore.getState().removeActivity(activity.id)
      }, 3000)
    }
  },
  updateActivity: (id, updates) =>
  {
    set((s) => ({
      activities: s.activities.map(a => a.id === id ? { ...a, ...updates } : a)
    }))
  },
  removeActivity: (id) =>
  {
    set((s) => ({
      activities: s.activities.filter(a => a.id !== id)
    }))
  },
  clearActivities: () => set({ activities: [] }),
  addToast: (toast) =>
  {
    set((s) => ({
      toasts: [...s.toasts, { ...toast, onClose: (id: string) => useChatStore.getState().removeToast(id) }]
    }))
  },
  removeToast: (id) =>
  {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
  loadMessages: async () =>
  {
    const messages = await loadStoredMessages()
    set({ messages })
  }
}))
