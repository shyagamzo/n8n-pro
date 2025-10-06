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
        
        // Initialize React app directly instead of loading external script
        initializeReactApp();
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

function initializeReactApp(): void
{
    console.log('[Content] Initializing React app directly');
    
    // Wait a bit for the panel to be fully created
    setTimeout(() => {
        const container = document.getElementById('n8n-pro-panel-root');
        if (container)
        {
            // Update loading message
            const loadingDiv = document.getElementById('react-loading');
            if (loadingDiv) {
                loadingDiv.textContent = 'React app loading...';
            }
            
            // Create a simple chat interface directly with vanilla JS
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; height: 100%; padding: 16px; box-sizing: border-box;">
                    <!-- Header -->
                    <div style="border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 16px;">
                        <h2 style="margin: 0; font-size: 18px; color: #333;">n8n AI Assistant</h2>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">Ask me to help with your workflows</p>
                    </div>
                    
                    <!-- Messages -->
                    <div id="messages" style="flex: 1; overflow-y: auto; margin-bottom: 16px; border: 1px solid #eee; border-radius: 4px; padding: 12px;">
                        <div style="text-align: center; color: #999; font-size: 14px; margin-top: 20px;">
                            Start a conversation to get help with your n8n workflows
                        </div>
                    </div>
                    
                    <!-- Input -->
                    <div style="display: flex; gap: 8px;">
                        <input id="message-input" type="text" placeholder="Ask me to help with your workflow..." 
                               style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        <button id="send-button" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            Send
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const input = document.getElementById('message-input') as HTMLInputElement;
            const button = document.getElementById('send-button') as HTMLButtonElement;
            const messages = document.getElementById('messages');
            
            function sendMessage() {
                if (!input.value.trim()) return;
                
                const messageDiv = document.createElement('div');
                messageDiv.style.cssText = 'margin-bottom: 12px; padding: 8px 12px; border-radius: 8px; background-color: #007bff; color: white; align-self: flex-end; max-width: 80%; word-wrap: break-word;';
                messageDiv.textContent = input.value;
                
                // Clear the placeholder message if it exists
                const placeholder = messages?.querySelector('div[style*="text-align: center"]');
                if (placeholder) {
                    placeholder.remove();
                }
                
                messages?.appendChild(messageDiv);
                input.value = '';
                
                // Scroll to bottom
                messages?.scrollTo(0, messages.scrollHeight);
            }
            
            button?.addEventListener('click', sendMessage);
            input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            console.log('[Content] React app initialized successfully (vanilla JS version)');
        }
        else
        {
            console.log('[Content] Panel root element not found, retrying in 100ms...');
            setTimeout(initializeReactApp, 100);
        }
    }, 100);
}

export {};
