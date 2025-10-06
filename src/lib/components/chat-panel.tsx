/**
 * Chat Panel Component
 * Main interface for the AI assistant
 */

import React, { useState } from 'react';

export function ChatPanel(): React.JSX.Element
{
    const [messages, setMessages] = useState<Array<{ id: string; content: string; isUser: boolean }>>([]);
    const [inputValue, setInputValue] = useState('');

    const handleSendMessage = (): void =>
    {
        if (!inputValue.trim()) return;

        const newMessage = {
            id: `msg_${Date.now()}`,
            content: inputValue,
            isUser: true
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue('');

        // TODO: Send message to background script for processing
        console.log('Sending message:', inputValue);
    };

    const handleKeyPress = (e: React.KeyboardEvent): void =>
    {
        if (e.key === 'Enter' && !e.shiftKey)
        {
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
