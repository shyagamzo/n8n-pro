# Error Handling Guide

## Overview

The n8n Pro Extension implements comprehensive error handling at multiple levels to ensure a robust user experience and effective debugging capabilities.

## Error Handling Architecture

### 1. Error Boundaries (React Level)
- **Global Error Boundary**: Catches React component errors
- **Component-level boundaries**: Isolate errors in specific features
- **Graceful degradation**: Show fallback UI instead of white screen

### 2. Service Level (API & Background)
- **Try-catch blocks**: Wrap all async operations
- **Error propagation**: Pass meaningful errors to UI
- **Retry logic**: Automatic retry for transient failures
- **Circuit breaker**: Prevent cascading failures

### 3. User Level (UI Feedback)
- **User-friendly messages**: Convert technical errors to readable text
- **Loading states**: Show progress during operations
- **Error recovery**: Provide actions to resolve issues
- **Debug information**: Show details in development mode

## Error Categories

### 1. Network Errors
**Examples:**
- API timeout
- Connection refused
- DNS resolution failed
- SSL certificate errors

**Handling:**
```typescript
try {
  const response = await fetchWithTimeout(url, options)
} catch (error) {
  if (error instanceof ApiError) {
    // Handle specific API errors
    if (error.status === 408) {
      showUserMessage('Request timed out. Please try again.')
    } else if (error.status >= 500) {
      showUserMessage('Server error. Please try again later.')
    }
  } else {
    showUserMessage('Network error. Check your connection.')
  }
}
```

### 2. Authentication Errors
**Examples:**
- Invalid API key
- Expired token
- Insufficient permissions
- Rate limit exceeded

**Handling:**
```typescript
if (error.status === 401) {
  showUserMessage('Invalid API key. Please check your settings.')
  redirectToOptions()
} else if (error.status === 429) {
  showUserMessage('Rate limit exceeded. Please wait a moment.')
  scheduleRetry()
}
```

### 3. Validation Errors
**Examples:**
- Invalid workflow structure
- Missing required fields
- Malformed Loom data
- Schema validation failures

**Handling:**
```typescript
const validation = validateWorkflow(workflow)
if (!validation.valid) {
  showUserMessage(`Workflow validation failed: ${formatValidationResult(validation)}`)
  highlightInvalidFields(validation.errors)
}
```

### 4. Parsing Errors
**Examples:**
- JSON parse errors
- Loom format errors
- Markdown rendering errors
- Type conversion errors

**Handling:**
```typescript
try {
  const parsed = parseLoom(response)
} catch (error) {
  console.error('Loom parsing failed:', error)
  showUserMessage('Failed to parse AI response. Please try rephrasing your request.')
  // Fallback to basic workflow
}
```

### 5. Extension Errors
**Examples:**
- Permission denied
- Storage quota exceeded
- Content script injection failed
- Background worker crashed

**Handling:**
```typescript
try {
  await chrome.storage.local.set(data)
} catch (error) {
  if (error.message.includes('quota')) {
    showUserMessage('Storage full. Please clear some data.')
  } else {
    showUserMessage('Extension error. Please reload the page.')
  }
}
```

## Error Handling Patterns

### 1. Graceful Degradation
```typescript
// Try advanced feature, fallback to basic
try {
  const advancedResult = await advancedFeature()
  return advancedResult
} catch (error) {
  console.warn('Advanced feature failed, using fallback:', error)
  return basicFeature()
}
```

### 2. Retry with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}
```

### 3. Circuit Breaker
```typescript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= 5) {
      this.state = 'OPEN'
    }
  }
}
```

### 4. Error Recovery
```typescript
function withErrorRecovery<T>(
  operation: () => Promise<T>,
  recovery: () => Promise<T>
): Promise<T> {
  return operation().catch(async (error) => {
    console.error('Operation failed, attempting recovery:', error)
    try {
      return await recovery()
    } catch (recoveryError) {
      console.error('Recovery also failed:', recoveryError)
      throw error // Throw original error
    }
  })
}
```

## User Experience

### 1. Error Messages
**Good Error Messages:**
- Clear and actionable
- Avoid technical jargon
- Suggest solutions
- Provide context

**Examples:**
```typescript
// ❌ Bad
"Error: 401 Unauthorized"

// ✅ Good
"Invalid API key. Please check your OpenAI settings in the Options page."

// ❌ Bad
"Failed to parse Loom response"

// ✅ Good
"Couldn't understand the AI response. Please try rephrasing your request."
```

### 2. Loading States
```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

async function handleOperation() {
  setIsLoading(true)
  setError(null)
  
  try {
    await performOperation()
  } catch (err) {
    setError(getUserFriendlyMessage(err))
  } finally {
    setIsLoading(false)
  }
}
```

### 3. Error Recovery Actions
```typescript
function ErrorRecovery({ error, onRetry, onReset }: ErrorRecoveryProps) {
  return (
    <div className="error-recovery">
      <p>{getErrorMessage(error)}</p>
      <div className="error-actions">
        <button onClick={onRetry}>Try Again</button>
        <button onClick={onReset}>Start Over</button>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    </div>
  )
}
```

## Debugging

### 1. Error Logging
```typescript
function logError(error: Error, context: Record<string, unknown>) {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    extensionVersion: chrome.runtime.getManifest().version
  })
}
```

### 2. Error Reporting
```typescript
function reportError(error: Error, context: Record<string, unknown>) {
  // In production, send to error reporting service
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, LogRocket, etc.
    // errorReportingService.captureException(error, { extra: context })
  }
  
  // Always log locally
  logError(error, context)
}
```

### 3. Debug Mode
```typescript
const DEBUG = localStorage.getItem('debug') === 'n8n:*'

function debugLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data)
  }
}
```

## Testing Error Handling

### 1. Unit Tests
```typescript
describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch
    
    const result = await apiCall()
    expect(result).toEqual({ error: 'Network error. Check your connection.' })
  })
  
  it('should retry on transient failures', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue('success')
    
    const result = await retryWithBackoff(mockOperation)
    expect(result).toBe('success')
    expect(mockOperation).toHaveBeenCalledTimes(2)
  })
})
```

### 2. Integration Tests
```typescript
describe('Error Scenarios', () => {
  it('should show error message when API key is invalid', async () => {
    // Mock invalid API key response
    mockApiResponse(401, { error: 'Invalid API key' })
    
    // Trigger action that requires API key
    await user.click(screen.getByText('Create Workflow'))
    
    // Verify error message is shown
    expect(screen.getByText('Invalid API key. Please check your settings.')).toBeInTheDocument()
  })
})
```

### 3. Manual Testing
```typescript
// Test error scenarios manually
const errorScenarios = [
  'Disconnect internet',
  'Invalid API key',
  'n8n server down',
  'Malformed AI response',
  'Storage quota exceeded',
  'Permission denied'
]

errorScenarios.forEach(scenario => {
  console.log(`Testing: ${scenario}`)
  // Simulate scenario and verify error handling
})
```

## Error Monitoring

### 1. Metrics to Track
- Error rate by category
- Error frequency by user
- Recovery success rate
- User actions after errors
- Performance impact of errors

### 2. Alerts
- Error rate spike (> 5%)
- New error types
- Critical path failures
- Performance degradation

### 3. Dashboards
- Real-time error monitoring
- Error trends over time
- User impact analysis
- Recovery success rates

## Best Practices

### 1. Error Prevention
- Validate inputs early
- Use TypeScript for type safety
- Implement proper loading states
- Test error scenarios

### 2. Error Handling
- Always handle errors explicitly
- Provide meaningful error messages
- Implement retry logic for transient errors
- Log errors for debugging

### 3. User Experience
- Don't show technical errors to users
- Provide recovery actions
- Maintain application state
- Test error scenarios

### 4. Development
- Use error boundaries
- Implement proper logging
- Test error paths
- Monitor error rates

## Common Error Scenarios

### 1. API Key Issues
```typescript
// Check API key before making requests
if (!apiKey) {
  showUserMessage('Please configure your API key in the Options page.')
  return
}
```

### 2. Network Issues
```typescript
// Handle network errors with retry
try {
  const response = await fetchWithRetry(url, options)
} catch (error) {
  if (isNetworkError(error)) {
    showUserMessage('Network error. Please check your connection and try again.')
  }
}
```

### 3. Parsing Issues
```typescript
// Handle parsing errors gracefully
try {
  const parsed = parseLoom(response)
} catch (error) {
  console.error('Parsing failed:', error)
  showUserMessage('Could not understand the AI response. Please try rephrasing your request.')
}
```

### 4. Storage Issues
```typescript
// Handle storage quota exceeded
try {
  await chrome.storage.local.set(data)
} catch (error) {
  if (error.message.includes('quota')) {
    showUserMessage('Storage full. Please clear some data and try again.')
  }
}
```

## Conclusion

The n8n Pro Extension implements comprehensive error handling that:

✅ **Prevents crashes** with error boundaries  
✅ **Provides clear feedback** to users  
✅ **Enables debugging** with detailed logging  
✅ **Supports recovery** with retry logic  
✅ **Maintains state** during errors  
✅ **Monitors performance** with metrics  

This ensures a robust and user-friendly experience even when things go wrong.

---

**Last Updated**: [Current Date]  
**Version**: 0.1.0  
**Next Review**: [Next Review Date]