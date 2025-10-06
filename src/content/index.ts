/**
 * Content Script for n8n Pro Extension
 * Injects the AI assistant panel into n8n interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
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
        console.log('[Content] Detected n8n page, injecting trigger button');
        injectTriggerButton();
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
                    console.log('[Content] n8n page detected on retry, injecting trigger button');
                    injectTriggerButton();
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
                injectTriggerButton();
            }
        }, 1000);
    }
});

function injectTriggerButton(): void
{
    console.log('[Content] Injecting trigger button');
    
    // Check if trigger button already exists
    if (document.getElementById('n8n-pro-trigger'))
    {
        console.log('[Content] Trigger button already exists');
        return;
    }
    
    // Create the trigger button
    const triggerButton = document.createElement('button');
    triggerButton.id = 'n8n-pro-trigger';
    triggerButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <span>AI</span>
    `;
    
    triggerButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        cursor: pointer;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Add hover effects
    triggerButton.addEventListener('mouseenter', () => {
        triggerButton.style.transform = 'scale(1.1)';
        triggerButton.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.4)';
    });
    
    triggerButton.addEventListener('mouseleave', () => {
        triggerButton.style.transform = 'scale(1)';
        triggerButton.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
    });
    
    // Add click handler
    triggerButton.addEventListener('click', () => {
        console.log('[Content] Trigger button clicked, opening panel');
        openAssistantPanel();
    });
    
    // Append to body
    document.body.appendChild(triggerButton);
    console.log('[Content] Trigger button injected successfully');
}

function openAssistantPanel(): void
{
    console.log('[Content] Opening assistant panel');
    
    // Check if panel already exists
    const existingPanel = document.getElementById('n8n-pro-panel');
    if (existingPanel)
    {
        console.log('[Content] Panel already exists, showing it');
        existingPanel.style.display = 'block';
        return;
    }
    
    // Inject the panel
    injectAssistantPanel();
    
    // Show the panel immediately after creation
    const panel = document.getElementById('n8n-pro-panel');
    if (panel) {
        panel.style.display = 'block';
        console.log('[Content] Panel created and shown');
    }
    
    // Initialize the React app
    initializeReactApp();
}

// React Chat Panel Component
interface Message {
    id: string;
    content: string;
    isUser: boolean;
}

function ChatPanel(): React.JSX.Element {
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [inputValue, setInputValue] = React.useState('');

    const handleSendMessage = (): void => {
        if (!inputValue.trim()) return;

        const newMessage: Message = {
            id: `msg_${Date.now()}`,
            content: inputValue,
            isUser: true
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue('');

        // TODO: Send message to background script for processing
        console.log('Sending message:', inputValue);
    };

    const handleKeyPress = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            padding: '16px',
            boxSizing: 'border-box'
        }}>
            {/* Header */}
            <div style={{ 
                borderBottom: '1px solid #eee', 
                paddingBottom: '12px', 
                marginBottom: '16px' 
            }}>
                <h2 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    color: '#333' 
                }}>
                    n8n AI Assistant
                </h2>
                <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: '14px', 
                    color: '#666' 
                }}>
                    Ask me to help with your workflows
                </p>
            </div>

            {/* Messages */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                marginBottom: '16px',
                border: '1px solid #eee',
                borderRadius: '4px',
                padding: '12px'
            }}>
                {messages.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        color: '#999', 
                        fontSize: '14px',
                        marginTop: '20px'
                    }}>
                        Start a conversation to get help with your n8n workflows
                    </div>
                ) : (
                    messages.map(message => (
                        <div
                            key={message.id}
                            style={{
                                marginBottom: '12px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                backgroundColor: message.isUser ? '#007bff' : '#f8f9fa',
                                color: message.isUser ? 'white' : '#333',
                                alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                wordWrap: 'break-word'
                            }}
                        >
                            {message.content}
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me to help with your workflow..."
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    );
}

function initializeReactApp(): void
{
    console.log('[Content] Initializing React app');
    
    // Wait a bit for the panel to be fully created
    setTimeout(() => {
        const container = document.getElementById('n8n-pro-panel-root');
        if (container)
        {
            // Clear any existing content
            container.innerHTML = '';
            
            // Create React root and render the component
            const root = createRoot(container);
            root.render(
                <React.StrictMode>
                    <ChatPanel />
                </React.StrictMode>
            );
            
            console.log('[Content] React app initialized successfully');
        }
        else
        {
            console.log('[Content] Panel root element not found, retrying in 100ms...');
            setTimeout(initializeReactApp, 100);
        }
    }, 100);
}

export {};
