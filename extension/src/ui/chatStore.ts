import { create } from 'zustand'
import type { ChatMessage } from '@shared/types/chat'
import type { ToastProps } from '@ui/primitives/Toast'
import type { AgentType } from '@shared/types/messaging'
import { STORAGE_KEYS } from '@shared/constants'
import { storageGet, storageSet } from '@platform/storage'
import type { WorkflowStateData } from '@shared/types/workflow-state'
import { createInitialState, isWorkingState, canUserInteract, isTerminalState } from '@shared/types/workflow-state'

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
  workflowState: WorkflowStateData
  activities: AgentActivity[]
  toasts: ToastProps[]
  setOpen: (open: boolean) => void
  addMessage: (msg: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  startSending: () => void
  finishSending: () => void
  clear: () => void
  clearSession: () => void
  setAssistantDraft: (t: string) => void
  setWorkflowState: (state: WorkflowStateData) => void
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
  workflowState: createInitialState(),
  activities: [],
  toasts: [],
  setOpen: (open) => set({ isOpen: open }),
  addMessage: (msg) =>
  {
    set((s) =>
    {
      const newMessages = [...s.messages, msg]

      // Only save non-streaming messages to storage
      if (!msg.streaming)
      {
        saveMessages(newMessages)
      }

      return { messages: newMessages }
    })
  },
  updateMessage: (id, updates) =>
  {
    set((s) =>
    {
      const newMessages = s.messages.map(m => m.id === id ? { ...m, ...updates } : m)

      // Only save to storage when message is no longer streaming
      if (updates.streaming === false || updates.streaming === undefined)
      {
        saveMessages(newMessages)
      }

      return { messages: newMessages }
    })
  },
  startSending: () => set({ sending: true }),
  finishSending: () => set({ sending: false, activities: [] }),
  clear: () => set({ messages: [] }),
  clearSession: () =>
  {
    set({ messages: [], assistantDraft: '', workflowState: createInitialState(), sending: false, activities: [] })
    saveMessages([])
  },
  setAssistantDraft: (t) => set({ assistantDraft: t }),
  setWorkflowState: (state) => set({ workflowState: state }),
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
  },
}))

// ─────────────────────────────────────────────────────────────
// Derived Selectors
// ─────────────────────────────────────────────────────────────

/**
 * Check if workflow is actively working (enrichment, planning, executing)
 *
 * @returns `true` if workflow is in a working state
 */
export const useIsWorkflowActive = (): boolean =>
{
  return useChatStore(state => isWorkingState(state.workflowState.state))
}

/**
 * Check if user can interact (idle, awaiting_approval, completed, failed)
 *
 * @returns `true` if user can send messages or interact with UI
 */
export const useCanUserInteract = (): boolean =>
{
  return useChatStore(state => canUserInteract(state.workflowState.state))
}

/**
 * Check if workflow has finished (completed or failed)
 *
 * @returns `true` if workflow is in a terminal state
 */
export const useIsWorkflowTerminal = (): boolean =>
{
  return useChatStore(state => isTerminalState(state.workflowState.state))
}

/**
 * Get current workflow state (for debugging)
 *
 * @returns Current workflow state data
 */
export const useCurrentWorkflowState = (): WorkflowStateData =>
{
  return useChatStore(state => state.workflowState)
}
