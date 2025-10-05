# Decision Record: API & Data Layer

## HTTP Client Strategy

### Custom Fetch Wrapper
- **Native Fetch**: Use native fetch API with custom wrapper
- **TypeScript-First**: Strongly typed request/response interfaces
- **Error Handling**: Consistent error handling across all API calls
- **Retry Logic**: Exponential backoff for transient failures
- **Timeout Management**: Configurable timeouts for different operations

### Fetch Wrapper Implementation
```typescript
interface FetchConfig
{
    baseUrl: string;
    timeout: number;
    retries: number;
    retryDelay: number;
    headers: Record<string, string>;
}

interface ApiResponse<T>
{
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
}

interface ApiError
{
    message: string;
    status: number;
    code: string;
    details?: any;
}

export class ApiClient
{
    private config: FetchConfig;

    constructor(config: Partial<FetchConfig> = {})
    {
        this.config = {
            baseUrl: '',
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            headers: {
                'Content-Type': 'application/json'
            },
            ...config
        };
    }

    async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>>
    {
        const url = `${this.config.baseUrl}${endpoint}`;
        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...this.config.headers,
                ...options.headers
            }
        };

        return this.executeWithRetry<T>(url, requestOptions);
    }

    private async executeWithRetry<T>(
        url: string,
        options: RequestInit,
        attempt: number = 1
    ): Promise<ApiResponse<T>>
    {
        try
        {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok)
            {
                throw new ApiError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    'HTTP_ERROR',
                    { url, status: response.status }
                );
            }

            const data = await response.json();

            return {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            };
        }
        catch (error)
        {
            if (attempt < this.config.retries && this.shouldRetry(error))
            {
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                await this.sleep(delay);
                return this.executeWithRetry<T>(url, options, attempt + 1);
            }

            throw error;
        }
    }

    private shouldRetry(error: any): boolean
    {
        if (error.name === 'AbortError') return false;
        if (error instanceof ApiError)
        {
            return error.status >= 500 || error.status === 429;
        }
        return true;
    }

    private sleep(ms: number): Promise<void>
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

## n8n API Client

### API Client Implementation
```typescript
interface N8nWorkflow
{
    id: string;
    name: string;
    nodes: N8nNode[];
    connections: Record<string, N8nConnection[]>;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

interface N8nNode
{
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, any>;
    credentials?: {
        [credentialType: string]: string;
    };
}

interface N8nConnection
{
    node: string;
    type: string;
    index: number;
}

export class N8nApiClient
{
    private apiClient: ApiClient;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string)
    {
        this.apiKey = apiKey;
        this.apiClient = new ApiClient({
            baseUrl: `${baseUrl}/api/v1`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async getWorkflows(): Promise<N8nWorkflow[]>
    {
        const response = await this.apiClient.request<N8nWorkflow[]>('/workflows');
        return response.data;
    }

    async getWorkflow(id: string): Promise<N8nWorkflow>
    {
        const response = await this.apiClient.request<N8nWorkflow>(`/workflows/${id}`);
        return response.data;
    }

    async createWorkflow(workflow: Omit<N8nWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<N8nWorkflow>
    {
        const response = await this.apiClient.request<N8nWorkflow>('/workflows', {
            method: 'POST',
            body: JSON.stringify(workflow)
        });
        return response.data;
    }

    async updateWorkflow(id: string, updates: Partial<N8nWorkflow>): Promise<N8nWorkflow>
    {
        const response = await this.apiClient.request<N8nWorkflow>(`/workflows/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
        return response.data;
    }

    async deleteWorkflow(id: string): Promise<void>
    {
        await this.apiClient.request(`/workflows/${id}`, {
            method: 'DELETE'
        });
    }

    async getCredentials(): Promise<N8nCredential[]>
    {
        const response = await this.apiClient.request<N8nCredential[]>('/credentials');
        return response.data;
    }

    async testConnection(credentialId: string): Promise<boolean>
    {
        try
        {
            await this.apiClient.request(`/credentials/${credentialId}/test`, {
                method: 'POST'
            });
            return true;
        }
        catch (error)
        {
            return false;
        }
    }
}
```

## Data Validation

### Input Validation
```typescript
import { z } from 'zod';

// Schema definitions
const WorkflowSchema = z.object({
    name: z.string().min(1).max(100),
    nodes: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        position: z.tuple([z.number(), z.number()]),
        parameters: z.record(z.any())
    })),
    connections: z.record(z.array(z.object({
        node: z.string(),
        type: z.string(),
        index: z.number()
    })))
});

const MessageSchema = z.object({
    text: z.string().min(1).max(1000),
    sender: z.enum(['user', 'bot']),
    timestamp: z.date()
});

// Validation functions
export const validateWorkflow = (data: unknown): N8nWorkflow =>
{
    return WorkflowSchema.parse(data);
};

export const validateMessage = (data: unknown): ChatMessage =>
{
    return MessageSchema.parse(data);
};

// Type guards
export const isWorkflow = (data: unknown): data is N8nWorkflow =>
{
    try
    {
        WorkflowSchema.parse(data);
        return true;
    }
    catch
    {
        return false;
    }
};
```

### Response Validation
```typescript
export class ValidatedApiClient extends ApiClient
{
    async request<T>(
        endpoint: string,
        options: RequestInit = {},
        validator?: (data: unknown) => T
    ): Promise<ApiResponse<T>>
    {
        const response = await super.request(endpoint, options);
        
        if (validator)
        {
            try
            {
                response.data = validator(response.data);
            }
            catch (error)
            {
                throw new ApiError(
                    'Invalid response format',
                    500,
                    'VALIDATION_ERROR',
                    { endpoint, error }
                );
            }
        }
        
        return response;
    }
}
```

## Caching Strategy

### Memory Cache
```typescript
interface CacheEntry<T>
{
    data: T;
    timestamp: number;
    ttl: number;
}

export class MemoryCache
{
    private cache = new Map<string, CacheEntry<any>>();

    set<T>(key: string, data: T, ttl: number = 300000): void // 5 minutes default
    {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    get<T>(key: string): T | null
    {
        const entry = this.cache.get(key);
        
        if (!entry)
        {
            return null;
        }
        
        if (Date.now() - entry.timestamp > entry.ttl)
        {
            this.cache.delete(key);
            return null;
        }
        
        return entry.data;
    }

    delete(key: string): void
    {
        this.cache.delete(key);
    }

    clear(): void
    {
        this.cache.clear();
    }
}
```

### Cached API Client
```typescript
export class CachedN8nApiClient extends N8nApiClient
{
    private cache: MemoryCache;

    constructor(baseUrl: string, apiKey: string)
    {
        super(baseUrl, apiKey);
        this.cache = new MemoryCache();
    }

    async getWorkflows(): Promise<N8nWorkflow[]>
    {
        const cacheKey = 'workflows';
        const cached = this.cache.get<N8nWorkflow[]>(cacheKey);
        
        if (cached)
        {
            return cached;
        }
        
        const workflows = await super.getWorkflows();
        this.cache.set(cacheKey, workflows, 60000); // 1 minute cache
        
        return workflows;
    }

    async getWorkflow(id: string): Promise<N8nWorkflow>
    {
        const cacheKey = `workflow-${id}`;
        const cached = this.cache.get<N8nWorkflow>(cacheKey);
        
        if (cached)
        {
            return cached;
        }
        
        const workflow = await super.getWorkflow(id);
        this.cache.set(cacheKey, workflow, 300000); // 5 minutes cache
        
        return workflow;
    }

    async updateWorkflow(id: string, updates: Partial<N8nWorkflow>): Promise<N8nWorkflow>
    {
        const workflow = await super.updateWorkflow(id, updates);
        
        // Invalidate related cache entries
        this.cache.delete('workflows');
        this.cache.delete(`workflow-${id}`);
        
        return workflow;
    }
}
```

## Data Transformation

### Workflow Transformers
```typescript
export class WorkflowTransformer
{
    static toN8nFormat(workflow: WorkflowDraft): N8nWorkflow
    {
        return {
            id: workflow.id || generateId(),
            name: workflow.name,
            nodes: workflow.nodes.map(node => ({
                id: node.id,
                name: node.name,
                type: node.type,
                typeVersion: 1,
                position: node.position,
                parameters: node.parameters,
                credentials: node.credentials
            })),
            connections: workflow.connections,
            active: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    static fromN8nFormat(n8nWorkflow: N8nWorkflow): Workflow
    {
        return {
            id: n8nWorkflow.id,
            name: n8nWorkflow.name,
            nodes: n8nWorkflow.nodes.map(node => ({
                id: node.id,
                name: node.name,
                type: node.type,
                position: node.position,
                parameters: node.parameters,
                credentials: node.credentials
            })),
            connections: n8nWorkflow.connections,
            active: n8nWorkflow.active,
            createdAt: new Date(n8nWorkflow.createdAt),
            updatedAt: new Date(n8nWorkflow.updatedAt)
        };
    }
}
```

## Error Handling

### API Error Classes
```typescript
export class ApiError extends Error
{
    constructor(
        message: string,
        public status: number,
        public code: string,
        public details?: any
    )
    {
        super(message);
        this.name = 'ApiError';
    }
}

export class N8nApiError extends ApiError
{
    constructor(message: string, status: number, details?: any)
    {
        super(message, status, 'N8N_API_ERROR', details);
        this.name = 'N8nApiError';
    }
}

export class OpenAiApiError extends ApiError
{
    constructor(message: string, details?: any)
    {
        super(message, 0, 'OPENAI_API_ERROR', details);
        this.name = 'OpenAiApiError';
    }
}
```

## Open Items
- **Request/Response Interceptors**: Add middleware for logging and monitoring
- **Offline Support**: Handle offline scenarios gracefully
- **Data Synchronization**: Sync local changes with remote
- **Performance Monitoring**: Track API performance metrics
