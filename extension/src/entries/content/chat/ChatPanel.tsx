import React from 'react'
import Panel from '@ui/primitives/Panel'
import type { ChatMessage } from '@shared/types/chat'
import type { AgentActivity } from '@ui/chatStore'
import MessagesList from './components/MessagesList'
import ChatComposer from './components/ChatComposer'
import AgentActivityPanel from '@ui/agent/AgentActivityPanel'
import '@ui/utilities.css'
import './styles.css'

type ChatPanelProps = {
    open: boolean
    onClose: () => void
    onNewSession?: () => void
    messages: ChatMessage[]
    draft: string
    sending: boolean
    activities: AgentActivity[]
    onSend: (text: string) => void
}

export default function ChatPanel({
    open,
    onClose,
    onNewSession,
    messages,
    draft,
    sending,
    activities,
    onSend
}: ChatPanelProps): React.ReactElement | null
{

    // Presentational only

    if (!open) return null
    return (
        <Panel title="n8n Assistant" onClose={onClose} onNewSession={onNewSession} showConnectionStatus>
            <div className="panel-body flex-column">
                <MessagesList messages={messages} draft={draft} sending={sending} onSend={onSend} />
                <AgentActivityPanel activities={activities} />
                <ChatComposer sending={sending} onSend={(text) => onSend(text)} />
            </div>
        </Panel>
    )
}


