import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface Message
{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const App: React.FC = () =>
{
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() =>
    {
        // Add welcome message
        setMessages([
            {
                id: '1',
                type: 'assistant',
                content: 'Hello! I\'m your n8n AI assistant. How can I help you with your workflows today?',
                timestamp: new Date()
            }
        ]);
    }, []);

    const handleSendMessage = async (): Promise<void> =>
    {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try
        {
            // Send message to background worker
            const response = await chrome.runtime.sendMessage({
                type: 'CHAT_MESSAGE',
                data: inputValue
            });

            if (response.success)
            {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'assistant',
                    content: response.data.content,
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, assistantMessage]);
            }
            else
            {
                throw new Error(response.error || 'Unknown error');
            }
        }
        catch (error)
        {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
        finally
        {
            setIsLoading(false);
        }
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
            backgroundColor: '#f8f9fa'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                backgroundColor: '#fff',
                borderBottom: '1px solid #e9ecef',
                fontSize: '18px',
                fontWeight: '600',
                color: '#495057'
            }}>
                n8n AI Assistant
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {messages.map((message) => (
                    <div
                        key={message.id}
                        style={{
                            alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            padding: '12px 16px',
                            borderRadius: '18px',
                            backgroundColor: message.type === 'user' ? '#007bff' : '#fff',
                            color: message.type === 'user' ? '#fff' : '#333',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            fontSize: '14px',
                            lineHeight: '1.4'
                        }}
                    >
                        {message.content}
                    </div>
                ))}
                {isLoading && (
                    <div style={{
                        alignSelf: 'flex-start',
                        padding: '12px 16px',
                        backgroundColor: '#fff',
                        borderRadius: '18px',
                        color: '#666',
                        fontSize: '14px'
                    }}>
                        Thinking...
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{
                padding: '16px',
                backgroundColor: '#fff',
                borderTop: '1px solid #e9ecef'
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me about your workflows..."
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            border: '1px solid #ced4da',
                            borderRadius: '24px',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        style={{
                            padding: '12px 20px',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '24px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            opacity: (!inputValue.trim() || isLoading) ? 0.5 : 1
                        }}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

// Mount the React app
const container = document.getElementById('root');
if (container)
{
    const root = createRoot(container);
    root.render(<App />);
}
