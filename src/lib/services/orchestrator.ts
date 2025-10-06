/**
 * Orchestrator Service
 * Central coordination service for the n8n Pro extension
 */

import { MessageType } from '@lib/types/message-types';
import { n8nApiService } from './n8n-api-service';

export class Orchestrator
{
    public async initialize(): Promise<void>
    {
        console.log('[Orchestrator] Initializing orchestrator service');
        
        // Initialize the n8n API service
        await n8nApiService.initialize();
        
        console.log('[Orchestrator] Orchestrator service initialized');
    }

    public async handleMessage(message: any, _sender: chrome.runtime.MessageSender): Promise<any>
    {
        console.log('[Orchestrator] Handling message:', message.type);
        
        switch (message.type)
        {
            case MessageType.CHAT_MESSAGE:
                return this.handleChatMessage(message);
            case MessageType.WORKFLOW_REQUEST:
                return this.handleWorkflowRequest(message);
            case MessageType.API_REQUEST:
                return this.handleApiRequest(message);
            case 'TEST_CONNECTION':
                return this.handleTestConnection(message);
            case 'GET_WORKFLOWS':
                return this.handleGetWorkflows(message);
            case 'GET_CREDENTIALS':
                return this.handleGetCredentials(message);
            default:
                throw new Error(`Unknown message type: ${message.type}`);
        }
    }

    public onStartup(): void
    {
        console.log('[Orchestrator] Extension startup');
        // TODO: Handle extension startup logic
    }

    private async handleChatMessage(_message: any): Promise<any>
    {
        // TODO: Implement chat message handling
        return { success: true, response: 'Chat message received' };
    }

    private async handleWorkflowRequest(_message: any): Promise<any>
    {
        // TODO: Implement workflow request handling
        return { success: true, response: 'Workflow request received' };
    }

    private async handleApiRequest(_message: any): Promise<any>
    {
        // TODO: Implement API request handling
        return { success: true, response: 'API request received' };
    }

    private async handleTestConnection(_message: any): Promise<any>
    {
        try
        {
            const result = await n8nApiService.testConnection();
            return {
                success: result.success,
                error: result.error,
                configured: n8nApiService.isConfigured()
            };
        }
        catch (error)
        {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                configured: false
            };
        }
    }

    private async handleGetWorkflows(_message: any): Promise<any>
    {
        try
        {
            if (!n8nApiService.isConfigured())
            {
                return {
                    success: false,
                    error: 'API service not configured',
                    workflows: []
                };
            }

            const workflows = await n8nApiService.getWorkflows();
            return {
                success: true,
                workflows,
                count: workflows.length
            };
        }
        catch (error)
        {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                workflows: []
            };
        }
    }

    private async handleGetCredentials(_message: any): Promise<any>
    {
        try
        {
            if (!n8nApiService.isConfigured())
            {
                return {
                    success: false,
                    error: 'API service not configured',
                    credentials: []
                };
            }

            const credentials = await n8nApiService.getCredentials();
            return {
                success: true,
                credentials,
                count: credentials.length
            };
        }
        catch (error)
        {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                credentials: []
            };
        }
    }
}
