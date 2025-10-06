/**
 * Content Script for n8n Pro Extension
 * Injects the AI assistant panel into n8n interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

// Main React App Component
function N8nProApp(): React.JSX.Element {
    const [isN8nPage, setIsN8nPage] = React.useState(false);
    const [showPanel, setShowPanel] = React.useState(false);

    React.useEffect(() => {
        // Check if we're on an n8n page
        const checkN8nPage = (): boolean => {
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

            const hasN8nMeta = document.querySelector('meta[name="n8n"]') !== null ||
                              document.querySelector('script[src*="n8n"]') !== null;

            const hasN8nGlobals = typeof (window as any).n8n !== 'undefined' ||
                                 typeof (window as any).workflow !== 'undefined';

            return hasN8nElements || hasN8nUrl || hasN8nMeta || hasN8nGlobals;
        };

        const isN8n = checkN8nPage();
        setIsN8nPage(isN8n);

        // For dynamic pages, check again after a delay
        if (!isN8n && (window.location.pathname.includes('/workflow') || window.location.pathname.includes('/workflows'))) {
            const timer = setTimeout(() => {
                setIsN8nPage(checkN8nPage());
            }, 2000);
            return () => clearTimeout(timer);
        }
        
        return undefined;
    }, []);

    React.useEffect(() => {
        // Handle messages from background script
        const messageListener = (message: any) => {
            console.log('[Content] Received message:', message);
            
            if (message.type === 'TOGGLE_PANEL') {
                console.log('[Content] Toggling panel visibility');
                setShowPanel(prev => !prev);
            } else if (message.type === 'PAGE_NAVIGATION') {
                console.log('[Content] Page navigation detected, re-checking n8n page');
                setTimeout(() => {
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

                    const hasN8nMeta = document.querySelector('meta[name="n8n"]') !== null ||
                                      document.querySelector('script[src*="n8n"]') !== null;

                    const hasN8nGlobals = typeof (window as any).n8n !== 'undefined' ||
                                         typeof (window as any).workflow !== 'undefined';

                    setIsN8nPage(hasN8nElements || hasN8nUrl || hasN8nMeta || hasN8nGlobals);
                }, 1000);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);
        return () => chrome.runtime.onMessage.removeListener(messageListener);
    }, []);

    if (!isN8nPage) {
        return <></>;
    }

    return (
        <>
            <TriggerButton onClick={() => setShowPanel(true)} />
            {showPanel && (
                <Panel 
                    onClose={() => setShowPanel(false)}
                    onToggle={() => setShowPanel(prev => !prev)}
                />
            )}
        </>
    );
}

// Trigger Button Component
interface TriggerButtonProps {
    onClick: () => void;
}

function TriggerButton({ onClick }: TriggerButtonProps): React.JSX.Element {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                width: '60px',
                height: '60px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                boxShadow: isHovered 
                    ? '0 6px 16px rgba(0, 123, 255, 0.4)' 
                    : '0 4px 12px rgba(0, 123, 255, 0.3)',
                cursor: 'pointer',
                zIndex: 10001,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                pointerEvents: 'auto'
            }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span>AI</span>
        </button>
    );
}

// Panel Component
interface PanelProps {
    onClose: () => void;
    onToggle: () => void;
}

function Panel({ onClose, onToggle }: PanelProps): React.JSX.Element {
    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                width: '400px',
                height: '600px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 10001,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'auto'
            }}
        >
            <ChatPanel onClose={onClose} onToggle={onToggle} />
        </div>
    );
}

// React Chat Panel Component
interface Message {
    id: string;
    content: string;
    isUser: boolean;
}

interface ChatPanelProps {
    onClose: () => void;
    onToggle: () => void;
}

function ChatPanel({ onClose }: ChatPanelProps): React.JSX.Element {
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
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <div>
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
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#666',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px'
                    }}
                    title="Close panel"
                >
                    ×
                </button>
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

// Initialize the React app
function initializeContentScript(): void {
    console.log('[Content] Initializing n8n Pro content script');
    
    // Create a container for our React app
    const container = document.createElement('div');
    container.id = 'n8n-pro-app';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
    `;
    
    // Make sure child elements can receive pointer events
    container.style.pointerEvents = 'none';
    
    document.body.appendChild(container);
    
    // Create React root and render the main app
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <N8nProApp />
        </React.StrictMode>
    );
    
    console.log('[Content] React app initialized successfully');
}

// Wait for the page to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

export {};
