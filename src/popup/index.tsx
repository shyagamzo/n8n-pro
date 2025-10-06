/**
 * Popup Component for n8n Pro Extension
 * Quick access interface when clicking the extension icon
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { PopupInterface } from '@components/popup-interface';

// Initialize the React app
const container = document.getElementById('n8n-pro-popup');
if (container)
{
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <PopupInterface />
        </React.StrictMode>
    );
}
else
{
    console.error('[Popup] Could not find popup container element');
}

export {};
