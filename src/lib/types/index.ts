/**
 * Core type definitions for the n8n AI Assistant extension
 */

export interface Message
{
    id: string;
    type: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface Workflow
{
    id: string;
    name: string;
    active: boolean;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
    settings?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface WorkflowNode
{
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, any>;
    credentials?: Record<string, string>;
}

export interface WorkflowConnection
{
    node: string;
    type: string;
    index: number;
}

export interface N8nApiResponse<T = any>
{
    data: T;
    success: boolean;
    error?: string;
}

export interface AgentResponse
{
    type: 'response' | 'action' | 'question';
    content: string;
    data?: any;
    timestamp: string;
}

export interface ExtensionSettings
{
    n8nUrl: string;
    apiKey: string;
    openaiKey: string;
    theme?: 'light' | 'dark' | 'auto';
}

export interface ChatState
{
    messages: Message[];
    isLoading: boolean;
    currentWorkflow?: Workflow;
    error?: string;
}
