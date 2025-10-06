/**
 * Options Page Component
 * Settings and configuration interface for the extension
 */

import { useState, useEffect } from 'react';

export function OptionsPage(): React.JSX.Element
{
    const [settings, setSettings] = useState({
        n8nUrl: '',
        apiKey: '',
        autoInject: true,
        theme: 'light'
    });
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() =>
    {
        // Load saved settings
        chrome.storage.sync.get(['n8nUrl', 'apiKey', 'autoInject', 'theme'], (result) =>
        {
            setSettings(prev => ({ ...prev, ...result }));
        });
    }, []);

    const handleSave = (): void =>
    {
        chrome.storage.sync.set(settings, () =>
        {
            console.log('Settings saved');
            
            // Update the API service configuration
            chrome.runtime.sendMessage({
                type: 'UPDATE_API_CONFIG',
                baseUrl: settings.n8nUrl,
                apiKey: settings.apiKey,
                timestamp: Date.now(),
                id: `config_${Date.now()}`
            });
            
            // Show success message
            alert('Settings saved successfully!');
        });
    };

    const handleInputChange = (key: string, value: string | boolean): void =>
    {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleTestConnection = (): void =>
    {
        if (!settings.n8nUrl || !settings.apiKey)
        {
            setConnectionStatus({ success: false, message: 'Please enter both URL and API key' });
            return;
        }

        setIsTestingConnection(true);
        setConnectionStatus(null);

        chrome.runtime.sendMessage({
            type: 'TEST_CONNECTION',
            timestamp: Date.now(),
            id: `test_${Date.now()}`
        }, (response) =>
        {
            setIsTestingConnection(false);
            
            if (response && response.success)
            {
                setConnectionStatus({ success: true, message: 'Connection successful!' });
            }
            else
            {
                setConnectionStatus({ 
                    success: false, 
                    message: response?.error || 'Connection failed' 
                });
            }
        });
    };

    return (
        <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto', 
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <h1 style={{ color: '#333', marginBottom: '30px' }}>
                n8n Pro Extension Settings
            </h1>

            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#555', marginBottom: '15px' }}>
                    n8n Configuration
                </h2>
                
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        fontWeight: '500' 
                    }}>
                        n8n Instance URL
                    </label>
                    <input
                        type="url"
                        value={settings.n8nUrl}
                        onChange={(e) => handleInputChange('n8nUrl', e.target.value)}
                        placeholder="https://your-n8n-instance.com"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        fontWeight: '500' 
                    }}>
                        API Key
                    </label>
                    <input
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => handleInputChange('apiKey', e.target.value)}
                        placeholder="Your n8n API key"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={handleTestConnection}
                        disabled={isTestingConnection || !settings.n8nUrl || !settings.apiKey}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: isTestingConnection ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isTestingConnection ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        {isTestingConnection ? 'Testing...' : 'Test Connection'}
                    </button>
                    
                    {connectionStatus && (
                        <div style={{ 
                            marginTop: '10px',
                            padding: '8px 12px',
                            backgroundColor: connectionStatus.success ? '#d4edda' : '#f8d7da',
                            border: `1px solid ${connectionStatus.success ? '#c3e6cb' : '#f5c6cb'}`,
                            borderRadius: '4px',
                            color: connectionStatus.success ? '#155724' : '#721c24',
                            fontSize: '14px'
                        }}>
                            {connectionStatus.message}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#555', marginBottom: '15px' }}>
                    Extension Settings
                </h2>
                
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px' 
                    }}>
                        <input
                            type="checkbox"
                            checked={settings.autoInject}
                            onChange={(e) => handleInputChange('autoInject', e.target.checked)}
                        />
                        <span>Automatically inject panel on n8n pages</span>
                    </label>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        fontWeight: '500' 
                    }}>
                        Theme
                    </label>
                    <select
                        value={settings.theme}
                        onChange={(e) => handleInputChange('theme', e.target.value)}
                        style={{
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                    </select>
                </div>
            </div>

            <button
                onClick={handleSave}
                style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                }}
            >
                Save Settings
            </button>
        </div>
    );
}
