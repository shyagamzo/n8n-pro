import React from 'react'
import Panel from '../lib/components/Panel'
import type { ChatMessage } from '../lib/types/chat'
import MessagesList from './components/MessagesList'
import PlanPreview from './components/PlanPreview'
import type { Plan } from '../lib/types/plan'
import ChatComposer from './components/ChatComposer'
import { panelBodyColumn } from './styles'

type ChatPanelProps = {
    open: boolean
    onClose: () => void
    messages: ChatMessage[]
    draft: string
    sending: boolean
    plan?: Plan | null
    onSend: (text: string) => void
}

export default function ChatPanel({
    open,
    onClose,
    messages,
    draft,
    plan,
    sending,
    onSend
}: ChatPanelProps): React.ReactElement | null
{

    // Presentational only

    if (!open) return null
    return (
        <Panel title="n8n Assistant" onClose={onClose}>
            <div style={panelBodyColumn}>
                <MessagesList messages={messages} draft={draft} sending={sending} />
                {plan ? <PlanPreview plan={plan} onCancel={() => { /* container clears plan */ }} /> : null}
                <ChatComposer sending={sending} onSend={(text) => onSend(text)} />
            </div>
        </Panel>
    )
}


