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
  setAssistantDraft: (t: string) => void
  setPendingPlan: (p: Plan | null) => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  messages: [],
  sending: false,
  assistantDraft: '',
  pendingPlan: null,
  setOpen: (open) => set({ isOpen: open }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  startSending: () => set({ sending: true }),
  finishSending: () => set({ sending: false }),
  clear: () => set({ messages: [] }),
  setAssistantDraft: (t) => set({ assistantDraft: t }),
  setPendingPlan: (p) => set({ pendingPlan: p })
}))
