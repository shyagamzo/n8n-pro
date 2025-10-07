import { create } from 'zustand'
import type { ChatMessage } from '../types/chat'

type ChatState = {
  isOpen: boolean
  messages: ChatMessage[]
  sending: boolean
  assistantDraft: string
  setOpen: (open: boolean) => void
  addMessage: (msg: ChatMessage) => void
  startSending: () => void
  finishSending: () => void
  clear: () => void
  setAssistantDraft: (t: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  messages: [],
  sending: false,
  assistantDraft: '',
  setOpen: (open) => set({ isOpen: open }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  startSending: () => set({ sending: true }),
  finishSending: () => set({ sending: false }),
  clear: () => set({ messages: [] }),
  setAssistantDraft: (t) => set({ assistantDraft: t })
}))


