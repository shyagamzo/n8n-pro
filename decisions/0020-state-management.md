# Decision Record: n8n Extension State Management

## n8n Extension State Management Strategy

### Primary Approach: Zustand
- **Lightweight**: Minimal boilerplate compared to Redux
- **TypeScript-First**: Excellent TypeScript support with type inference
- **React Integration**: Simple hooks-based API
- **Performance**: Efficient re-renders with selective subscriptions
- **Extension-Friendly**: Works well in Chrome extension environment

### Alternative: Context API (Limited Use)
- **Configuration State**: For settings that rarely change
- **Theme State**: For n8n theme integration
- **Avoid for Complex State**: Keep Context API for simple, stable state only

## n8n Extension State Architecture

### Store Organization
```
src/lib/stores/
├── chat-store.ts          # Chat messages and UI state
├── agent-store.ts         # AI agent orchestration state
├── workflow-store.ts      # Workflow creation and management
├── settings-store.ts      # User preferences and configuration
├── ui-store.ts           # Panel state, modals, notifications
└── index.ts              # Store exports and initialization
```

## Store Implementations

### Chat Store
- Manage chat messages, typing indicators, and streaming state
- Handle message CRUD operations with immutable updates
- Support message status tracking (sending, sent, error)

### Agent Store
- Track current agent, status, and task execution
- Manage agent history and enrichment questions
- Handle ambiguity detection and resolution

### Workflow Store
- Manage current workflow, drafts, and available workflows
- Track creation progress and error states
- Handle workflow changes and API integration

### Settings Store
- Manage API keys, model selection, and theme preferences
- Handle panel position and size settings
- Persist settings to chrome.storage.local

## State Persistence

### Chrome Storage Integration
- **Settings Persistence**: Store user preferences in chrome.storage.local
- **Session State**: Keep chat and workflow state in memory only
- **Secure Storage**: API keys stored securely in chrome.storage.local
- **Automatic Sync**: Load settings on extension startup

### State Hydration
```typescript
// Initialize stores with persisted data
export const initializeStores = async (): Promise<void> =>
{
    const settingsStore = useSettingsStore.getState();
    await settingsStore.loadSettings();
    
    // Apply theme from settings
    const { theme } = settingsStore;
    if (theme !== 'auto')
    {
        document.documentElement.setAttribute('data-theme', theme);
    }
};
```

## State Synchronization

### Cross-Store Communication
- **Event-Based**: Use custom events for loose coupling
- **Shared Services**: Use service layer for complex interactions
- **Minimal Dependencies**: Avoid direct store-to-store dependencies
- **Clear Data Flow**: Unidirectional data flow patterns

### State Updates
```typescript
// Example: Workflow creation triggers chat message
export const createWorkflow = async (description: string): Promise<void> =>
{
    const chatStore = useChatStore.getState();
    const workflowStore = useWorkflowStore.getState();
    
    // Add user message to chat
    chatStore.addMessage({
        text: description,
        sender: 'user'
    });
    
    // Start workflow creation
    workflowStore.setCreating(true);
    
    try
    {
        const workflow = await n8n.createWorkflow(description);
        workflowStore.setCurrentWorkflow(workflow);
        
        // Add success message to chat
        chatStore.addMessage({
            text: 'Workflow created successfully!',
            sender: 'bot'
        });
    }
    catch (error)
    {
        workflowStore.setLastError(error.message);
        
        // Add error message to chat
        chatStore.addMessage({
            text: 'Failed to create workflow. Please try again.',
            sender: 'bot',
            status: 'error',
            error: error.message
        });
    }
    finally
    {
        workflowStore.setCreating(false);
    }
};
```

## Performance Optimization

### Selective Subscriptions
- **Component-Level**: Subscribe only to needed state slices
- **Memoization**: Use React.memo for expensive components
- **Shallow Comparison**: Zustand's built-in shallow comparison
- **Batch Updates**: Group related state updates

### State Normalization
- **Flat Structure**: Avoid deeply nested state
- **ID-Based References**: Use IDs for entity relationships
- **Computed Values**: Derive complex state from simple state
- **Immutable Updates**: Use immutable update patterns

## Testing State Management

### Store Testing
```typescript
// Test store actions and state changes
describe('ChatStore', () =>
{
    beforeEach(() =>
    {
        useChatStore.setState({
            messages: [],
            isTyping: false,
            currentInput: '',
            isStreaming: false
        });
    });

    it('should add a new message', () =>
    {
        const { addMessage } = useChatStore.getState();
        
        addMessage({
            text: 'Hello',
            sender: 'user'
        });
        
        const { messages } = useChatStore.getState();
        expect(messages).toHaveLength(1);
        expect(messages[0].text).toBe('Hello');
        expect(messages[0].sender).toBe('user');
    });
});
```

## Open Items
- **State Migration**: Handle state schema changes
- **State Analytics**: Track state usage patterns
- **State Validation**: Runtime state validation
- **State Backup**: Backup and restore state functionality
