/**
 * Main Panel Component for n8n Pro Extension
 * React-based AI assistant interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatPanel } from '@components/chat-panel';

// Initialize the React app
const container = document.getElementById('n8n-pro-panel');
if (container)
{
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <ChatPanel />
        </React.StrictMode>
    );
}
else
{
    console.error('[Panel] Could not find panel container element');
}

export {};
