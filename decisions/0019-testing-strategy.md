# Decision Record: Testing Strategy

## Testing Philosophy

### Test Pyramid Approach
- **Unit Tests (80%)**: Test individual functions, components, and utilities in isolation
- **Integration Tests (20%)**: Test interactions between modules and external APIs
- **No E2E Tests**: Skip end-to-end testing for MVP

### Testing Principles
- **Test Public APIs Only**: Focus on behavior, not implementation details
- **Meaningful Test Names**: Describe what is being tested and expected outcome
- **Small, Focused Tests**: One concept per test, clear assertions
- **Fast Feedback**: Tests should run quickly and provide immediate feedback
- **Reliable Tests**: Tests should be deterministic and not flaky

## Testing Frameworks

### Unit Testing
- **Jest**: Primary testing framework for JavaScript/TypeScript
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing
- **@testing-library/user-event**: User interaction simulation

### Integration Testing
- **Jest**: For testing service integrations and API clients
- **MSW (Mock Service Worker)**: Mock HTTP requests for n8n API testing
- **Chrome Extension Testing**: Use Chrome extension testing utilities

### Manual Testing
- **Manual Verification**: Manual testing of extension functionality
- **User Acceptance Testing**: Manual testing with real users
- **Chrome Extension Testing**: Manual testing in Chrome environment

## Test Structure

### Unit Tests
```typescript
// Example: Testing a utility function
describe('WorkflowValidator', () =>
{
    describe('validateWorkflowDescription', () =>
    {
        it('should return true for valid workflow descriptions', () =>
        {
            // Arrange
            const description = 'Send email when form submitted';
            
            // Act
            const result = WorkflowValidator.validateWorkflowDescription(description);
            
            // Assert
            expect(result).toBe(true);
        });
        
        it('should return false for empty descriptions', () =>
        {
            // Arrange
            const description = '';
            
            // Act
            const result = WorkflowValidator.validateWorkflowDescription(description);
            
            // Assert
            expect(result).toBe(false);
        });
    });
});
```

### Component Tests
```typescript
// Example: Testing a React component
describe('ChatPanel', () =>
{
    it('should display user messages', () =>
    {
        // Arrange
        const messages = [
            { id: '1', text: 'Hello', sender: 'user' },
            { id: '2', text: 'Hi there!', sender: 'bot' }
        ];
        
        // Act
        render(<ChatPanel messages={messages} />);
        
        // Assert
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
    
    it('should call onSendMessage when user sends a message', async () =>
    {
        // Arrange
        const onSendMessage = jest.fn();
        const user = userEvent.setup();
        
        render(<ChatPanel onSendMessage={onSendMessage} />);
        
        // Act
        await user.type(screen.getByRole('textbox'), 'Test message');
        await user.click(screen.getByRole('button', { name: /send/i }));
        
        // Assert
        expect(onSendMessage).toHaveBeenCalledWith('Test message');
    });
});
```

### Integration Tests
```typescript
// Example: Testing API client
describe('N8nApiClient', () =>
{
    beforeEach(() =>
    {
        server.use(
            rest.get('http://localhost:5678/api/v1/workflows', (req, res, ctx) =>
            {
                return res(ctx.json([
                    { id: '1', name: 'Test Workflow' }
                ]));
            })
        );
    });
    
    it('should fetch workflows from n8n API', async () =>
    {
        // Arrange
        const apiClient = new N8nApiClient('http://localhost:5678');
        
        // Act
        const workflows = await apiClient.getWorkflows();
        
        // Assert
        expect(workflows).toHaveLength(1);
        expect(workflows[0].name).toBe('Test Workflow');
    });
});
```

## Test Organization

### File Structure
```
src/
├── __tests__/
│   ├── unit/
│   │   ├── utils/
│   │   ├── services/
│   │   └── models/
│   ├── integration/
│   │   ├── api/
│   │   └── agents/
│   └── components/
│       ├── panel/
│       └── options/
├── __mocks__/
│   ├── chrome-extension.ts
│   └── n8n-api.ts
└── __fixtures__/
    ├── workflows.json
    └── messages.json
```

### Test Naming Convention
- **Unit Tests**: `*.test.ts` or `*.spec.ts`
- **Integration Tests**: `*.integration.test.ts`
- **Test Files**: Co-located with source files or in `__tests__` directory

## Mocking Strategy

### Chrome Extension APIs
```typescript
// __mocks__/chrome-extension.ts
export const chrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn()
        }
    },
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        }
    }
};
```

### n8n API
```typescript
// __mocks__/n8n-api.ts
export const mockN8nApi = {
    getWorkflows: jest.fn(),
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    deleteWorkflow: jest.fn()
};
```

### LLM Responses
```typescript
// __mocks__/openai.ts
export const mockOpenAI = {
    chat: {
        completions: {
            create: jest.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: 'Mock AI response'
                    }
                }]
            })
        }
    }
};
```

## Test Data Management

### Fixtures
- **Workflow Data**: Sample workflows for testing
- **Message Data**: Sample chat messages
- **API Responses**: Mock API response data
- **User Data**: Test user configurations

### Test Utilities
```typescript
// Test utilities for common operations
export const testUtils = {
    createMockWorkflow: (overrides = {}) => ({
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [],
        connections: {},
        ...overrides
    }),
    
    createMockMessage: (overrides = {}) => ({
        id: 'test-message',
        text: 'Test message',
        sender: 'user',
        timestamp: new Date(),
        ...overrides
    })
};
```

## Coverage Requirements

### Coverage Targets
- **Unit Tests**: 80% code coverage minimum
- **Integration Tests**: 70% coverage of API interactions
- **Critical Paths**: 100% coverage of core workflow creation logic
- **Error Handling**: 90% coverage of error scenarios

### Coverage Exclusions
- **Configuration files**: Exclude config files from coverage
- **Type definitions**: Exclude TypeScript type files
- **Test files**: Exclude test files themselves
- **Generated code**: Exclude any generated or build artifacts

## CI/CD Integration

### Test Execution
- **Pre-commit**: Run unit tests before commits
- **Pull Requests**: Run full test suite on PRs
- **Main Branch**: Run all tests on main branch
- **Coverage Reports**: Generate and track coverage reports

### Test Environments
- **Local Development**: Fast unit and component tests
- **CI Environment**: Full test suite with mocked external dependencies
- **Staging**: Manual testing with real n8n instance
- **Production**: Manual smoke tests only

## Open Items
- **Test Data Seeding**: Strategy for test data management
- **Performance Testing**: Load testing for extension performance
- **Visual Regression**: Screenshot testing for UI consistency
- **Accessibility Testing**: Automated accessibility testing
- **E2E Testing**: Consider adding E2E tests in future versions
