/**
 * Popup Interface Component
 * Quick access interface for the extension popup
 */

import { useState, useEffect } from 'react';

export function PopupInterface(): React.JSX.Element
{
    const [isConnected, setIsConnected] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');

    useEffect(() =>
    {
        // Check if we're on an n8n page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
        {
            if (tabs[0]?.url)
            {
                setCurrentUrl(tabs[0].url);
                setIsConnected(isN8nUrl(tabs[0].url));
            }
        });
    }, []);

    const isN8nUrl = (url: string): boolean =>
    {
        return url.includes('n8n') || url.includes('localhost');
    };

    const openOptions = (): void =>
    {
        chrome.runtime.openOptionsPage();
    };

    const openN8n = (): void =>
    {
        chrome.tabs.create({ url: 'http://localhost:5678' });
    };

    return (
        <div style={{ 
            padding: '20px',
            backgroundColor: '#f8f9fa',
            minHeight: '100%',
            boxSizing: 'border-box'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '20px', 
                    color: '#333' 
                }}>
                    n8n Pro
                </h1>
                <p style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    color: '#666' 
                }}>
                    AI Assistant for n8n
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                    padding: '12px',
                    backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
                    border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
                    borderRadius: '4px',
                    textAlign: 'center'
                }}>
                    <div style={{ 
                        fontSize: '14px',
                        color: isConnected ? '#155724' : '#721c24',
                        fontWeight: '500'
                    }}>
                        {isConnected ? '✓ Connected to n8n' : '⚠ Not on n8n page'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                    onClick={openN8n}
                    style={{
                        padding: '12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    Open n8n (localhost)
                </button>

                <button
                    onClick={openOptions}
                    style={{
                        padding: '12px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    Settings
                </button>
            </div>

            {currentUrl && (
                <div style={{ 
                    marginTop: '20px',
                    padding: '8px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#6c757d',
                    wordBreak: 'break-all'
                }}>
                    Current: {currentUrl}
                </div>
            )}
        </div>
    );
}
