/**
 * n8n API Service
 * Service layer for managing n8n API client and configuration
 */

import { N8nApiClient } from '@lib/api/n8n-api-client';
import { N8nWorkflow, N8nCredential, N8nApiError } from '@lib/types/n8n-api-types';

export class N8nApiService
{
    private client: N8nApiClient | null = null;
    private baseUrl: string = '';
    private apiKey: string = '';

    /**
     * Initialize the API service with configuration
     */
    public async initialize(): Promise<void>
    {
        try
        {
            const config = await this.loadConfiguration();
            if (config.baseUrl && config.apiKey)
            {
                this.baseUrl = config.baseUrl;
                this.apiKey = config.apiKey;
                this.client = new N8nApiClient(config.baseUrl, config.apiKey);
                
                console.log('[N8nApiService] Initialized with base URL:', config.baseUrl);
            }
            else
            {
                console.warn('[N8nApiService] No configuration found, API client not initialized');
            }
        }
        catch (error)
        {
            console.error('[N8nApiService] Failed to initialize:', error);
        }
    }

    /**
     * Load configuration from extension storage
     */
    private async loadConfiguration(): Promise<{ baseUrl: string; apiKey: string }>
    {
        return new Promise((resolve) =>
        {
            chrome.storage.sync.get(['n8nUrl', 'apiKey'], (result) =>
            {
                resolve({
                    baseUrl: result['n8nUrl'] || '',
                    apiKey: result['apiKey'] || ''
                });
            });
        });
    }

    /**
     * Update configuration and reinitialize client
     */
    public async updateConfiguration(baseUrl: string, apiKey: string): Promise<void>
    {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.client = new N8nApiClient(baseUrl, apiKey);

        // Save to storage
        await new Promise<void>((resolve) =>
        {
            chrome.storage.sync.set({ n8nUrl: baseUrl, apiKey }, () =>
            {
                console.log('[N8nApiService] Configuration updated');
                resolve();
            });
        });
    }

    /**
     * Check if the API service is configured and ready
     */
    public isConfigured(): boolean
    {
        return this.client !== null && this.baseUrl !== '' && this.apiKey !== '';
    }

    /**
     * Test the API connection
     */
    public async testConnection(): Promise<{ success: boolean; error?: string }>
    {
        if (!this.client)
        {
            return { success: false, error: 'API client not initialized' };
        }

        try
        {
            const isConnected = await this.client.testConnection();
            return { success: isConnected };
        }
        catch (error)
        {
            const errorMessage = error instanceof N8nApiError 
                ? error.message 
                : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Get all workflows
     */
    public async getWorkflows(): Promise<N8nWorkflow[]>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.getWorkflows();
    }

    /**
     * Get a specific workflow
     */
    public async getWorkflow(id: string): Promise<N8nWorkflow>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.getWorkflow(id);
    }

    /**
     * Create a new workflow
     */
    public async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.createWorkflow(workflow);
    }

    /**
     * Update an existing workflow
     */
    public async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.updateWorkflow(id, workflow);
    }

    /**
     * Delete a workflow
     */
    public async deleteWorkflow(id: string): Promise<void>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.deleteWorkflow(id);
    }

    /**
     * Get all credentials
     */
    public async getCredentials(): Promise<N8nCredential[]>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.getCredentials();
    }

    /**
     * Check if a credential exists
     */
    public async hasCredential(id: string): Promise<boolean>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.hasCredential(id);
    }

    /**
     * Execute a workflow
     */
    public async executeWorkflow(id: string, input?: any): Promise<{ executionId: string }>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.executeWorkflow(id, input);
    }

    /**
     * Get execution status
     */
    public async getExecution(id: string): Promise<any>
    {
        if (!this.client)
        {
            throw new Error('API client not initialized');
        }

        return this.client.getExecution(id);
    }

    /**
     * Get the current configuration
     */
    public getConfiguration(): { baseUrl: string; apiKey: string }
    {
        return {
            baseUrl: this.baseUrl,
            apiKey: this.apiKey
        };
    }

    /**
     * Clear configuration and reset client
     */
    public async clearConfiguration(): Promise<void>
    {
        this.baseUrl = '';
        this.apiKey = '';
        this.client = null;

        await new Promise<void>((resolve) =>
        {
            chrome.storage.sync.remove(['n8nUrl', 'apiKey'], () =>
            {
                console.log('[N8nApiService] Configuration cleared');
                resolve();
            });
        });
    }
}

// Singleton instance
export const n8nApiService = new N8nApiService();
