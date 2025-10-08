import React from 'react'
import Panel from '../lib/components/Panel'
import type { ChatMessage } from '../lib/types/chat'
import MessagesList from './components/MessagesList'
import ChatComposer from './components/ChatComposer'
import '../lib/styles/utilities.css'
import './styles.css'

type ChatPanelProps = {
    open: boolean
    onClose: () => void
    onNewSession?: () => void
    messages: ChatMessage[]
    draft: string
    sending: boolean
    onSend: (text: string) => void
}

export default function ChatPanel({
    open,
    onClose,
    onNewSession,
    messages,
    draft,
    sending,
    onSend
}: ChatPanelProps): React.ReactElement | null
{

    // Presentational only

    if (!open) return null
    return (
        <Panel title="n8n Assistant" onClose={onClose} onNewSession={onNewSession}>
            <div className="panel-body flex-column">
                <MessagesList messages={messages} draft={draft} sending={sending} />
                <ChatComposer sending={sending} onSend={(text) => onSend(text)} />
            </div>
        </Panel>
    )
}


