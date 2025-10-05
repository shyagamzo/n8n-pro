# Decision Record: Error Handling & Logging

## Error Classification

### Error Types
- **User Errors**: Invalid input, missing credentials, workflow validation failures
- **API Errors**: n8n API failures, OpenAI API rate limits, network timeouts
- **System Errors**: Extension crashes, memory issues, browser compatibility
- **Agent Errors**: LLM processing failures, agent orchestration issues
- **Security Errors**: Authentication failures, permission denials, data validation

### Error Severity Levels
- **Critical**: Extension crashes, data loss, security breaches
- **High**: API failures, workflow creation failures, user blocking issues
- **Medium**: Non-critical feature failures, performance issues
- **Low**: Warnings, deprecated API usage, minor validation issues

## Error Handling Strategy

### Graceful Degradation
- **Fallback Mechanisms**: Provide alternative paths when primary functionality fails
- **User Communication**: Clear, actionable error messages for users
- **Recovery Options**: Allow users to retry or use alternative approaches
- **State Preservation**: Maintain user context during error recovery

### Error Boundaries (React)
```typescript
// Error boundary for React components
class ChatPanelErrorBoundary extends React.Component
{
    constructor(props)
    {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error)
    {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo)
    {
        Logger.error('ChatPanel Error', error, errorInfo);
    }

    render()
    {
        if (this.state.hasError)
        {
            return (
                <ErrorFallback
                    error={this.state.error}
                    onRetry={() => this.setState({ hasError: false, error: null })}
                />
            );
        }

        return this.props.children;
    }
}
```

### API Error Handling
```typescript
// Custom error classes for different error types
export class N8nApiError extends Error
{
    constructor(
        message: string,
        public statusCode: number,
        public endpoint: string,
        public originalError?: Error
    )
    {
        super(message);
        this.name = 'N8nApiError';
    }
}

export class OpenAiApiError extends Error
{
    constructor(
        message: string,
        public errorType: string,
        public originalError?: Error
    )
    {
        super(message);
        this.name = 'OpenAiApiError';
    }
}

// Error handling in API client
export class N8nApiClient
{
    async getWorkflows(): Promise<Workflow[]>
    {
        try
        {
            const response = await this.fetch('/api/v1/workflows');
            return response.data;
        }
        catch (error)
        {
            if (error instanceof N8nApiError)
            {
                throw error;
            }
            
            throw new N8nApiError(
                'Failed to fetch workflows',
                500,
                '/api/v1/workflows',
                error
            );
        }
    }
}
```

## Logging Infrastructure

### Logger Implementation
```typescript
// Centralized logging service
export class Logger
{
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.INFO;

    public static getInstance(): Logger
    {
        if (!Logger.instance)
        {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public error(message: string, error?: Error, context?: any): void
    {
        this.log(LogLevel.ERROR, message, error, context);
    }

    public warn(message: string, context?: any): void
    {
        this.log(LogLevel.WARN, message, undefined, context);
    }

    public info(message: string, context?: any): void
    {
        this.log(LogLevel.INFO, message, undefined, context);
    }

    public debug(message: string, context?: any): void
    {
        this.log(LogLevel.DEBUG, message, undefined, context);
    }

    private log(level: LogLevel, message: string, error?: Error, context?: any): void
    {
        if (level < this.logLevel) return;

        const logEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined,
            context: this.sanitizeContext(context)
        };

        // Console logging for development
        if (process.env.NODE_ENV === 'development')
        {
            console.log(`[${level}] ${message}`, logEntry);
        }

        // Store locally for debugging (no external transmission)
        this.storeLogEntry(logEntry);
    }

    private sanitizeContext(context: any): any
    {
        // Remove sensitive data from logs
        if (!context) return context;
        
        const sanitized = { ...context };
        delete sanitized.apiKey;
        delete sanitized.password;
        delete sanitized.token;
        
        return sanitized;
    }

    private storeLogEntry(entry: LogEntry): void
    {
        // Store in chrome.storage.local for debugging
        chrome.storage.local.get(['logs'], (result) =>
        {
            const logs = result.logs || [];
            logs.push(entry);
            
            // Keep only last 100 log entries
            if (logs.length > 100)
            {
                logs.splice(0, logs.length - 100);
            }
            
            chrome.storage.local.set({ logs });
        });
    }
}
```

### Log Levels
```typescript
enum LogLevel
{
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

interface LogEntry
{
    timestamp: string;
    level: LogLevel;
    message: string;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    context?: any;
}
```

## User-Facing Error Handling

### Error Messages
- **Clear Language**: Use plain language, avoid technical jargon
- **Actionable**: Tell users what they can do to resolve the issue
- **Context-Aware**: Provide relevant context for the error
- **Non-Blocking**: Don't prevent users from continuing their work

### Error UI Components
```typescript
// Error display component
export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry, onDismiss }) =>
{
    const getErrorMessage = (error: Error): string =>
    {
        if (error instanceof N8nApiError)
        {
            switch (error.statusCode)
            {
                case 401:
                    return 'Please check your n8n API key in the extension settings.';
                case 404:
                    return 'The requested workflow was not found.';
                case 500:
                    return 'n8n server error. Please try again later.';
                default:
                    return 'Failed to connect to n8n. Please check your connection.';
            }
        }
        
        if (error instanceof OpenAiApiError)
        {
            return 'AI service temporarily unavailable. Please try again.';
        }
        
        return 'An unexpected error occurred. Please try again.';
    };

    return (
        <div className="error-message">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
                <h3>Something went wrong</h3>
                <p>{getErrorMessage(error)}</p>
                <div className="error-actions">
                    {onRetry && (
                        <button onClick={onRetry} className="retry-button">
                            Try Again
                        </button>
                    )}
                    {onDismiss && (
                        <button onClick={onDismiss} className="dismiss-button">
                            Dismiss
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
```

## Debugging Tools

### Development Debugging
- **Console Logging**: Detailed logging in development mode
- **Error Tracking**: Track errors with stack traces and context
- **Performance Monitoring**: Monitor API response times and memory usage
- **State Inspection**: Tools to inspect application state

### Production Debugging
- **Error Reporting**: Collect error information for analysis
- **User Feedback**: Allow users to report issues
- **Diagnostic Information**: Collect system and extension information
- **Log Export**: Allow users to export logs for support

### Debug Utilities
```typescript
// Debug utilities for development
export class DebugUtils
{
    public static logApiCall(endpoint: string, method: string, data?: any): void
    {
        if (process.env.NODE_ENV === 'development')
        {
            console.log(`API Call: ${method} ${endpoint}`, data);
        }
    }

    public static logAgentFlow(agent: string, action: string, data?: any): void
    {
        if (process.env.NODE_ENV === 'development')
        {
            console.log(`Agent Flow: ${agent} -> ${action}`, data);
        }
    }

    public static measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<T>
    {
        const start = performance.now();
        return fn().then(result =>
        {
            const end = performance.now();
            console.log(`Performance: ${name} took ${end - start}ms`);
            return result;
        });
    }
}
```

## Error Recovery

### Retry Mechanisms
- **Exponential Backoff**: Retry failed operations with increasing delays
- **Circuit Breaker**: Stop retrying after repeated failures
- **User-Initiated Retry**: Allow users to manually retry operations
- **Fallback Strategies**: Use alternative approaches when primary fails

### State Recovery
- **Session Persistence**: Save user state to recover from crashes
- **Workflow Recovery**: Save draft workflows to prevent data loss
- **Context Preservation**: Maintain user context during error recovery
- **Graceful Shutdown**: Clean up resources when extension closes

## Monitoring & Alerting

### Error Monitoring
- **Error Rate Tracking**: Monitor error rates and trends
- **Performance Metrics**: Track response times and resource usage
- **User Impact Assessment**: Measure impact of errors on user experience
- **Trend Analysis**: Identify patterns in errors and failures

### Alerting (Future)
- **Critical Error Alerts**: Immediate notification of critical issues
- **Performance Degradation**: Alert on significant performance issues
- **User Impact Thresholds**: Alert when error rates exceed thresholds
- **Automated Recovery**: Automatic recovery from known error conditions

## Open Items
- **Error Analytics**: Detailed error analysis and reporting
- **User Feedback Integration**: Collect user feedback on errors
- **Automated Error Recovery**: Self-healing mechanisms
- **Performance Monitoring**: Real-time performance tracking
