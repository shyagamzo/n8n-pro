/**
 * n8n API Types
 * TypeScript definitions for n8n REST API
 */

export interface N8nApiConfig
{
    timeout: number;
    retries: number;
    retryDelay: number;
}

export interface N8nApiResponse<T>
{
    data: T;
    status: number;
    success: boolean;
}

export class N8nApiError extends Error
{
    public status: number;
    public data: any;

    constructor(message: string, status: number, data: any = null)
    {
        super(message);
        this.name = 'N8nApiError';
        this.status = status;
        this.data = data;
    }
}

export interface N8nWorkflow
{
    id: string;
    name: string;
    active: boolean;
    nodes: N8nNode[];
    connections: N8nConnection;
    settings?: N8nWorkflowSettings;
    staticData?: any;
    tags?: N8nTag[];
    createdAt: string;
    updatedAt: string;
}

export interface N8nNode
{
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, any>;
    credentials?: Record<string, string>;
    webhookId?: string;
    disabled?: boolean;
    notes?: string;
    continueOnFail?: boolean;
    alwaysOutputData?: boolean;
    executeOnce?: boolean;
    retryOnFail?: boolean;
    maxTries?: number;
    waitBetweenTries?: number;
}

export interface N8nConnection
{
    [nodeId: string]: {
        [outputIndex: string]: Array<{
            node: string;
            type: string;
            index: number;
        }>;
    };
}

export interface N8nWorkflowSettings
{
    executionOrder?: 'v1' | 'v2';
    saveManualExecutions?: boolean;
    callersPolicy?: 'workflowsFromSameOwner' | 'workflowsFromSameOwnerAndUsers' | 'allUsers';
    errorWorkflow?: string;
    timezone?: string;
    executionTimeout?: number;
    maxExecutionTime?: number;
}

export interface N8nTag
{
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export interface N8nCredential
{
    id: string;
    name: string;
    type: string;
    data: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface N8nExecution
{
    id: string;
    finished: boolean;
    mode: 'manual' | 'trigger';
    startedAt: string;
    stoppedAt?: string;
    workflowId: string;
    workflowData: N8nWorkflow;
    data: N8nExecutionData;
    status: 'running' | 'success' | 'error' | 'crashed' | 'canceled';
    error?: N8nExecutionError;
}

export interface N8nExecutionData
{
    resultData: {
        runData: Record<string, N8nNodeExecutionData[]>;
        error?: N8nExecutionError;
    };
}

export interface N8nNodeExecutionData
{
    startTime: number;
    executionTime: number;
    data: {
        main: Array<Array<Record<string, any>>>;
    };
    error?: N8nExecutionError;
}

export interface N8nExecutionError
{
    message: string;
    stack?: string;
    name?: string;
    code?: string;
    node?: {
        name: string;
        type: string;
    };
}

export interface N8nApiKey
{
    id: string;
    name: string;
    apiKey: string;
    createdAt: string;
    lastUsedAt?: string;
}

export interface N8nUser
{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isOwner: boolean;
    isPending: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface N8nInstanceInfo
{
    version: string;
    type: 'cloud' | 'self-hosted';
    url: string;
    features: string[];
}

// Request/Response types for specific operations
export interface CreateWorkflowRequest
{
    name: string;
    nodes: N8nNode[];
    connections: N8nConnection;
    active?: boolean;
    settings?: N8nWorkflowSettings;
    tags?: string[];
}

export interface UpdateWorkflowRequest
{
    name?: string;
    nodes?: N8nNode[];
    connections?: N8nConnection;
    active?: boolean;
    settings?: N8nWorkflowSettings;
    tags?: string[];
}

export interface ExecuteWorkflowRequest
{
    input?: any;
    waitForExecution?: boolean;
}

export interface ListWorkflowsResponse
{
    data: N8nWorkflow[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

export interface ListCredentialsResponse
{
    data: N8nCredential[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

export interface ListExecutionsResponse
{
    data: N8nExecution[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}
