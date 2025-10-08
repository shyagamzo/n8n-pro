import React, { useEffect, useState } from 'react'
import ChatPanel from './ChatPanel'
import { useChatStore } from '../lib/state/chatStore'
import { chat } from '../lib/services/chat'
import ConfirmModal from '../lib/components/ConfirmModal'

export default function ChatContainer(): React.ReactElement | null
{
  const { isOpen, setOpen, messages, assistantDraft, sending, clearSession, loadMessages } = useChatStore()
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Load persisted messages on mount
  useEffect(() =>
  {
    loadMessages()
  }, [loadMessages])

  return (
    <>
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
          onConfirm={() => {
            clearSession()
            setShowConfirmModal(false)
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </>
  )
}


