/**
 * n8n API Client
 * Custom fetch wrapper for n8n REST API integration
 */

import { N8nApiError, N8nApiResponse, N8nApiConfig, N8nWorkflow, N8nCredential } from '@lib/types/n8n-api-types';

export class N8nApiClient
{
    private baseUrl: string;
    private apiKey: string;
    private config: N8nApiConfig;

    constructor(baseUrl: string, apiKey: string, config: Partial<N8nApiConfig> = {})
    {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = apiKey;
        this.config = {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            ...config
        };
    }

    /**
     * Make an authenticated request to the n8n API
     */
    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<N8nApiResponse<T>>
    {
        const url = `${this.baseUrl}/api/v2${endpoint}`;
        
        const requestOptions: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                ...options.headers
            }
        };

        try
        {
            const response = await this.fetchWithRetry(url, requestOptions);
            const data = await response.json();

            if (!response.ok)
            {
                throw new N8nApiError(
                    data.message || `HTTP ${response.status}`,
                    response.status,
                    data
                );
            }

            return {
                data,
                status: response.status,
                success: true
            };
        }
        catch (error)
        {
            if (error instanceof N8nApiError)
            {
                throw error;
            }

            throw new N8nApiError(
                error instanceof Error ? error.message : 'Unknown error',
                0,
                null
            );
        }
    }

    /**
     * Fetch with retry logic and timeout
     */
    private async fetchWithRetry(url: string, options: RequestInit, attempt: number = 1): Promise<Response>
    {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try
        {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Retry on server errors (5xx) or rate limiting (429)
            if ((response.status >= 500 || response.status === 429) && attempt < this.config.retries)
            {
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                console.warn(`[N8nApiClient] Retrying request (attempt ${attempt + 1}/${this.config.retries}) after ${delay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, attempt + 1);
            }

            return response;
        }
        catch (error)
        {
            clearTimeout(timeoutId);

            // Retry on network errors
            if (attempt < this.config.retries && this.isRetryableError(error))
            {
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                console.warn(`[N8nApiClient] Retrying request (attempt ${attempt + 1}/${this.config.retries}) after ${delay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Check if an error is retryable
     */
    private isRetryableError(error: unknown): boolean
    {
        if (error instanceof Error)
        {
            return error.name === 'AbortError' || 
                   error.message.includes('network') ||
                   error.message.includes('timeout');
        }
        return false;
    }

    /**
     * Test API connection
     */
    public async testConnection(): Promise<boolean>
    {
        try
        {
            await this.makeRequest('/workflows');
            return true;
        }
        catch (error)
        {
            console.error('[N8nApiClient] Connection test failed:', error);
            return false;
        }
    }

    /**
     * Get all workflows
     */
    public async getWorkflows(): Promise<N8nWorkflow[]>
    {
        const response = await this.makeRequest<{ data: N8nWorkflow[] }>('/workflows');
        return response.data.data || [];
    }

    /**
     * Get a specific workflow by ID
     */
    public async getWorkflow(id: string): Promise<N8nWorkflow>
    {
        const response = await this.makeRequest<{ data: N8nWorkflow }>(`/workflows/${id}`);
        return response.data.data;
    }

    /**
     * Create a new workflow
     */
    public async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow>
    {
        const response = await this.makeRequest<{ data: N8nWorkflow }>('/workflows', {
            method: 'POST',
            body: JSON.stringify(workflow)
        });
        return response.data.data;
    }

    /**
     * Update an existing workflow
     */
    public async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow>
    {
        const response = await this.makeRequest<{ data: N8nWorkflow }>(`/workflows/${id}`, {
            method: 'PUT',
            body: JSON.stringify(workflow)
        });
        return response.data.data;
    }

    /**
     * Delete a workflow
     */
    public async deleteWorkflow(id: string): Promise<void>
    {
        await this.makeRequest(`/workflows/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get all credentials (metadata only)
     */
    public async getCredentials(): Promise<N8nCredential[]>
    {
        const response = await this.makeRequest<{ data: N8nCredential[] }>('/credentials');
        return response.data.data || [];
    }

    /**
     * Check if a specific credential exists
     */
    public async hasCredential(id: string): Promise<boolean>
    {
        try
        {
            await this.makeRequest(`/credentials/${id}`);
            return true;
        }
        catch (error)
        {
            if (error instanceof N8nApiError && error.status === 404)
            {
                return false;
            }
            throw error;
        }
    }

    /**
     * Execute a workflow
     */
    public async executeWorkflow(id: string, input?: any): Promise<{ executionId: string }>
    {
        const response = await this.makeRequest<{ data: { executionId: string } }>(`/workflows/${id}/execute`, {
            method: 'POST',
            body: input ? JSON.stringify({ input }) : null
        });
        return response.data.data;
    }

    /**
     * Get execution status
     */
    public async getExecution(id: string): Promise<any>
    {
        const response = await this.makeRequest<{ data: any }>(`/executions/${id}`);
        return response.data.data;
    }
}
