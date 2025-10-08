import React, { useEffect, useState } from 'react'
import ChatPanel from './ChatPanel'
import { useChatStore } from '../lib/state/chatStore'
import { chat } from '../lib/services/chat'
import ConfirmModal from '../lib/components/ConfirmModal'
import ErrorBoundary from '../lib/components/ErrorBoundary'
import Panel from '../lib/components/Panel'
import PanelSkeleton from './components/PanelSkeleton'
import ToastContainer from '../lib/components/ToastContainer'

export default function ChatContainer(): React.ReactElement | null
{
  const { isOpen, setOpen, messages, assistantDraft, sending, clearSession, loadMessages, toasts, removeToast } = useChatStore()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load persisted messages on mount
  useEffect(() =>
  {
    void loadMessages().then(() =>
    {
      // Show skeleton for at least 300ms for smooth transition
      setTimeout(() => setIsLoading(false), 300)
    })
  }, [loadMessages])

  // Show skeleton during initial load
  if (isOpen && isLoading)
  {
    return (
      <Panel title="n8n Assistant" onClose={() => setOpen(false)} showConnectionStatus>
        <PanelSkeleton />
      </Panel>
    )
  }

  return (
    <ErrorBoundary>
      <ChatPanel
        open={isOpen}
        onClose={() => setOpen(false)}
        onNewSession={() => setShowConfirmModal(true)}
        messages={messages}
        draft={assistantDraft}
        sending={sending}
        onSend={(text) => chat.send(text)}
      />
      {isOpen && (
        <ConfirmModal
          isOpen={showConfirmModal}
          title="Start New Session?"
          message="This will clear the current chat history. Are you sure you want to continue?"
          confirmText="Start New Session"
          cancelText="Cancel"
          onConfirm={() =>
          {
            clearSession()
            setShowConfirmModal(false)
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ErrorBoundary>
  )
}


