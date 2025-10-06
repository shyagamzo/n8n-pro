/**
 * Message Types for Extension Communication
 */

export enum MessageType
{
    CHAT_MESSAGE = 'CHAT_MESSAGE',
    WORKFLOW_REQUEST = 'WORKFLOW_REQUEST',
    API_REQUEST = 'API_REQUEST',
    PANEL_INJECTED = 'PANEL_INJECTED',
    WORKFLOW_CREATED = 'WORKFLOW_CREATED',
    ERROR = 'ERROR'
}

export interface BaseMessage
{
    type: MessageType;
    timestamp: number;
    id: string;
}

export interface ChatMessage extends BaseMessage
{
    type: MessageType.CHAT_MESSAGE;
    content: string;
    userId?: string;
}

export interface WorkflowRequest extends BaseMessage
{
    type: MessageType.WORKFLOW_REQUEST;
    description: string;
    options?: WorkflowOptions;
}

export interface WorkflowOptions
{
    complexity?: 'simple' | 'medium' | 'complex';
    nodes?: string[];
    triggers?: string[];
}

export interface ApiRequest extends BaseMessage
{
    type: MessageType.API_REQUEST;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
}

export interface ErrorMessage extends BaseMessage
{
    type: MessageType.ERROR;
    error: string;
    details?: any;
}
