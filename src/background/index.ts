/**
 * Background Service Worker
 * Orchestrates AI agents and handles n8n API communication
 */

import { Orchestrator } from './orchestrator';

class BackgroundService
{
    private orchestrator: Orchestrator;

    constructor()
    {
        this.orchestrator = new Orchestrator();
        this.setupMessageHandlers();
    }

    private setupMessageHandlers(): void
    {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
        {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
    }

    private async handleMessage(
        message: any,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
    ): Promise<void>
    {
        try
        {
            switch (message.type)
            {
                case 'CHAT_MESSAGE':
                {
                    const response = await this.orchestrator.processMessage(message.data);
                    sendResponse({ success: true, data: response });
                    break;
                }
                
                case 'GET_WORKFLOWS':
                {
                    const workflows = await this.orchestrator.getWorkflows();
                    sendResponse({ success: true, data: workflows });
                    break;
                }
                
                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        }
        catch (error)
        {
            console.error('Background service error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
        }
    }
}

// Initialize the background service
new BackgroundService();
