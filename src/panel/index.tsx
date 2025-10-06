/**
 * Main Panel Component for n8n Pro Extension
 * React-based AI assistant interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatPanel } from '@components/chat-panel';

// Initialize the React app with retry logic
function initializeReactApp(): void
{
    const container = document.getElementById('n8n-pro-panel-root');
    if (container)
    {
        // Update loading message
        const loadingDiv = document.getElementById('react-loading');
        if (loadingDiv) {
            loadingDiv.textContent = 'React app loading...';
        }
        
        const root = createRoot(container);
        root.render(
            <React.StrictMode>
                <ChatPanel />
            </React.StrictMode>
        );
        console.log('[Panel] React app initialized successfully');
    }
    else
    {
        console.log('[Panel] Panel root element not found, retrying in 100ms...');
        // Retry after a short delay in case the panel is still being created
        setTimeout(initializeReactApp, 100);
    }
}

// Start initialization
initializeReactApp();

export {};
