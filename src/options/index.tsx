/**
 * Options Page for n8n Pro Extension
 * Settings and configuration interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { OptionsPage } from '@components/options-page';

// Initialize the React app
const container = document.getElementById('n8n-pro-options');
if (container)
{
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <OptionsPage />
        </React.StrictMode>
    );
}
else
{
    console.error('[Options] Could not find options container element');
}

export {};
