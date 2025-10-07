import { create } from 'zustand'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
}

type ChatState = {
  isOpen: boolean
  messages: ChatMessage[]
  sending: boolean
  setOpen: (open: boolean) => void
  addMessage: (msg: ChatMessage) => void
  startSending: () => void
  finishSending: () => void
  clear: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  messages: [],
  sending: false,
  setOpen: (open) => set({ isOpen: open }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  startSending: () => set({ sending: true }),
  finishSending: () => set({ sending: false }),
  clear: () => set({ messages: [] })
}))


