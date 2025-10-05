/**
 * Content Script
 * Injects into n8n pages and mounts the chatbot panel
 */

import { N8nDetector } from './n8n-detector';
import { PanelMounter } from './panel-mounter';

class ContentScript
{
    private n8nDetector: N8nDetector;
    private panelMounter: PanelMounter;
    private isN8nPage: boolean = false;

    constructor()
    {
        this.n8nDetector = new N8nDetector();
        this.panelMounter = new PanelMounter();
        this.init();
    }

    private async init(): Promise<void>
    {
        // Check if we're on an n8n page
        this.isN8nPage = await this.n8nDetector.detectN8n();
        
        if (this.isN8nPage)
        {
            await this.setupN8nIntegration();
        }
    }

    private async setupN8nIntegration(): Promise<void>
    {
        // Wait for n8n to be fully loaded
        await this.waitForN8nReady();
        
        // Mount the chatbot panel
        await this.panelMounter.mountPanel();
        
        // Set up message handlers
        this.setupMessageHandlers();
    }

    private async waitForN8nReady(): Promise<void>
    {
        // Wait for n8n editor to be available
        return new Promise((resolve) =>
        {
            const checkInterval = setInterval(() =>
            {
                const editor = document.querySelector('[data-test-id="workflow-canvas"]');
                if (editor)
                {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    private setupMessageHandlers(): void
    {
        // Listen for messages from the panel
        window.addEventListener('message', (event) =>
        {
            if (event.source !== window) return;
            
            if (event.data.type === 'N8N_AI_MESSAGE')
            {
                this.handlePanelMessage(event.data);
            }
        });
    }

    private async handlePanelMessage(data: any): Promise<void>
    {
        // Forward messages to background worker
        const response = await chrome.runtime.sendMessage({
            type: 'CHAT_MESSAGE',
            data: data.message
        });
        
        // Send response back to panel
        window.postMessage({
            type: 'N8N_AI_RESPONSE',
            data: response
        }, '*');
    }
}

// Initialize content script
new ContentScript();
