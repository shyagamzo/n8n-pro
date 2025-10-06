/**
 * Content Script for n8n Pro Extension
 * Injects the AI assistant panel into n8n interface
 */

import { injectAssistantPanel, togglePanelVisibility } from '@lib/services/panel-injector';

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
        
        // For dynamic pages, wait a bit and check again
        if (window.location.pathname.includes('/workflow') || window.location.pathname.includes('/workflows'))
        {
            console.log('[Content] Workflow page detected, retrying injection in 2 seconds');
            setTimeout(() =>
            {
                if (isN8nPage())
                {
                    console.log('[Content] n8n page detected on retry, injecting panel');
                    injectAssistantPanel();
                }
            }, 2000);
        }
    }
}

function isN8nPage(): boolean
{
    // Check for n8n-specific elements or URL patterns
    const hasN8nElements = document.querySelector('[data-test-id="workflow-canvas"]') !== null ||
                          document.querySelector('.workflow-canvas') !== null ||
                          document.querySelector('#workflow-canvas') !== null ||
                          document.querySelector('[data-test-id="node-creator"]') !== null ||
                          document.querySelector('.node-creator') !== null ||
                          document.querySelector('[data-test-id="workflow-editor"]') !== null ||
                          document.querySelector('.workflow-editor') !== null;
    
    const hasN8nUrl = window.location.hostname.includes('n8n') ||
                     window.location.pathname.includes('/workflow') ||
                     window.location.pathname.includes('/workflows') ||
                     window.location.pathname.includes('/executions') ||
                     window.location.pathname.includes('/settings') ||
                     window.location.pathname.includes('/credentials');
    
    // Check for n8n-specific meta tags or scripts
    const hasN8nMeta = document.querySelector('meta[name="n8n"]') !== null ||
                      document.querySelector('script[src*="n8n"]') !== null;
    
    // Check for n8n-specific global variables
    const hasN8nGlobals = typeof (window as any).n8n !== 'undefined' ||
                         typeof (window as any).workflow !== 'undefined';
    
    return hasN8nElements || hasN8nUrl || hasN8nMeta || hasN8nGlobals;
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) =>
{
    console.log('[Content] Received message:', message);
    
    if (message.type === 'TOGGLE_PANEL')
    {
        console.log('[Content] Toggling panel visibility');
        togglePanelVisibility();
    }
    else if (message.type === 'PAGE_NAVIGATION')
    {
        console.log('[Content] Page navigation detected, re-checking n8n page');
        // Re-check if we're on an n8n page and inject if needed
        setTimeout(() =>
        {
            if (isN8nPage())
            {
                injectAssistantPanel();
            }
        }, 1000);
    }
});

export {};
