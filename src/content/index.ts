/**
 * Content Script for n8n Pro Extension
 * Injects the AI assistant panel into n8n interface
 */

import { injectAssistantPanel } from '@lib/services/panel-injector';

// Wait for the page to be fully loaded
if (document.readyState === 'loading')
{
    document.addEventListener('DOMContentLoaded', initializeContentScript);
}
else
{
    initializeContentScript();
}

function initializeContentScript(): void
{
    console.log('[Content] Initializing n8n Pro content script');
    
    // Check if we're on an n8n page
    if (isN8nPage())
    {
        console.log('[Content] Detected n8n page, injecting assistant panel');
        injectAssistantPanel();
    }
    else
    {
        console.log('[Content] Not on n8n page, skipping injection');
    }
}

function isN8nPage(): boolean
{
    // Check for n8n-specific elements or URL patterns
    const hasN8nElements = document.querySelector('[data-test-id="workflow-canvas"]') !== null ||
                          document.querySelector('.workflow-canvas') !== null ||
                          document.querySelector('#workflow-canvas') !== null;
    
    const hasN8nUrl = window.location.hostname.includes('n8n') ||
                     window.location.pathname.includes('/workflow') ||
                     window.location.pathname.includes('/workflows');
    
    return hasN8nElements || hasN8nUrl;
}

export {};
