# Decision Record: State Management

## State Management Strategy

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

## State Architecture

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

### State Separation Principles
- **Domain-Based Stores**: Each store handles one business domain
- **Minimal Cross-Store Dependencies**: Avoid circular dependencies
- **Clear Boundaries**: Well-defined interfaces between stores
- **Single Source of Truth**: Each piece of state has one authoritative source

## Store Implementations

### Chat Store
```typescript
interface ChatMessage
{
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
    error?: string;
}

interface ChatState
{
    messages: ChatMessage[];
    isTyping: boolean;
    currentInput: string;
    isStreaming: boolean;
}

interface ChatActions
{
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    setTyping: (isTyping: boolean) => void;
    setCurrentInput: (input: string) => void;
    setStreaming: (isStreaming: boolean) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
    // State
    messages: [],
    isTyping: false,
    currentInput: '',
    isStreaming: false,

    // Actions
    addMessage: (message) => set((state) => ({
        messages: [...state.messages, {
            ...message,
            id: generateId(),
            timestamp: new Date()
        }]
    })),

    updateMessage: (id, updates) => set((state) => ({
        messages: state.messages.map(msg =>
            msg.id === id ? { ...msg, ...updates } : msg
        )
    })),

    setTyping: (isTyping) => set({ isTyping }),
    setCurrentInput: (currentInput) => set({ currentInput }),
    setStreaming: (isStreaming) => set({ isStreaming }),
    clearMessages: () => set({ messages: [] })
}));
```

### Agent Store
```typescript
interface AgentState
{
    currentAgent: 'classifier' | 'enrichment' | 'planner' | 'executor' | null;
    agentStatus: 'idle' | 'processing' | 'error';
    currentTask: string | null;
    agentHistory: AgentExecution[];
    isAmbiguous: boolean;
    enrichmentQuestions: string[];
}

interface AgentActions
{
    setCurrentAgent: (agent: AgentState['currentAgent']) => void;
    setAgentStatus: (status: AgentState['agentStatus']) => void;
    setCurrentTask: (task: string | null) => void;
    addAgentExecution: (execution: AgentExecution) => void;
    setAmbiguous: (isAmbiguous: boolean) => void;
    addEnrichmentQuestion: (question: string) => void;
    clearEnrichmentQuestions: () => void;
}

export const useAgentStore = create<AgentState & AgentActions>((set, get) => ({
    // State
    currentAgent: null,
    agentStatus: 'idle',
    currentTask: null,
    agentHistory: [],
    isAmbiguous: false,
    enrichmentQuestions: [],

    // Actions
    setCurrentAgent: (currentAgent) => set({ currentAgent }),
    setAgentStatus: (agentStatus) => set({ agentStatus }),
    setCurrentTask: (currentTask) => set({ currentTask }),
    
    addAgentExecution: (execution) => set((state) => ({
        agentHistory: [...state.agentHistory, execution]
    })),

    setAmbiguous: (isAmbiguous) => set({ isAmbiguous }),
    addEnrichmentQuestion: (question) => set((state) => ({
        enrichmentQuestions: [...state.enrichmentQuestions, question]
    })),
    clearEnrichmentQuestions: () => set({ enrichmentQuestions: [] })
}));
```

### Workflow Store
```typescript
interface WorkflowState
{
    currentWorkflow: Workflow | null;
    workflowDraft: WorkflowDraft | null;
    availableWorkflows: Workflow[];
    isCreating: boolean;
    creationProgress: number;
    lastError: string | null;
}

interface WorkflowActions
{
    setCurrentWorkflow: (workflow: Workflow | null) => void;
    setWorkflowDraft: (draft: WorkflowDraft | null) => void;
    setAvailableWorkflows: (workflows: Workflow[]) => void;
    setCreating: (isCreating: boolean) => void;
    setCreationProgress: (progress: number) => void;
    setLastError: (error: string | null) => void;
    applyWorkflowChanges: (changes: WorkflowChanges) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState & WorkflowActions>((set, get) => ({
    // State
    currentWorkflow: null,
    workflowDraft: null,
    availableWorkflows: [],
    isCreating: false,
    creationProgress: 0,
    lastError: null,

    // Actions
    setCurrentWorkflow: (currentWorkflow) => set({ currentWorkflow }),
    setWorkflowDraft: (workflowDraft) => set({ workflowDraft }),
    setAvailableWorkflows: (availableWorkflows) => set({ availableWorkflows }),
    setCreating: (isCreating) => set({ isCreating }),
    setCreationProgress: (creationProgress) => set({ creationProgress }),
    setLastError: (lastError) => set({ lastError }),

    applyWorkflowChanges: async (changes) =>
    {
        set({ isCreating: true, creationProgress: 0, lastError: null });
        
        try
        {
            const apiClient = new N8nApiClient();
            await apiClient.applyWorkflowChanges(changes);
            set({ isCreating: false, creationProgress: 100 });
        }
        catch (error)
        {
            set({ 
                isCreating: false, 
                lastError: error.message,
                creationProgress: 0
            });
        }
    }
}));
```

### Settings Store
```typescript
interface SettingsState
{
    openaiApiKey: string | null;
    n8nApiKey: string | null;
    n8nBaseUrl: string;
    selectedModel: string;
    theme: 'light' | 'dark' | 'auto';
    panelPosition: { x: number; y: number };
    panelSize: { width: number; height: number };
}

interface SettingsActions
{
    setOpenaiApiKey: (key: string | null) => void;
    setN8nApiKey: (key: string | null) => void;
    setN8nBaseUrl: (url: string) => void;
    setSelectedModel: (model: string) => void;
    setTheme: (theme: SettingsState['theme']) => void;
    setPanelPosition: (position: SettingsState['panelPosition']) => void;
    setPanelSize: (size: SettingsState['panelSize']) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
    // State
    openaiApiKey: null,
    n8nApiKey: null,
    n8nBaseUrl: 'http://localhost:5678',
    selectedModel: 'gpt-5',
    theme: 'auto',
    panelPosition: { x: 0, y: 0 },
    panelSize: { width: 500, height: 400 },

    // Actions
    setOpenaiApiKey: (openaiApiKey) => set({ openaiApiKey }),
    setN8nApiKey: (n8nApiKey) => set({ n8nApiKey }),
    setN8nBaseUrl: (n8nBaseUrl) => set({ n8nBaseUrl }),
    setSelectedModel: (selectedModel) => set({ selectedModel }),
    setTheme: (theme) => set({ theme }),
    setPanelPosition: (panelPosition) => set({ panelPosition }),
    setPanelSize: (panelSize) => set({ panelSize }),

    loadSettings: async () =>
    {
        try
        {
            const result = await chrome.storage.local.get([
                'openaiApiKey',
                'n8nApiKey',
                'n8nBaseUrl',
                'selectedModel',
                'theme',
                'panelPosition',
                'panelSize'
            ]);

            set({
                openaiApiKey: result.openaiApiKey || null,
                n8nApiKey: result.n8nApiKey || null,
                n8nBaseUrl: result.n8nBaseUrl || 'http://localhost:5678',
                selectedModel: result.selectedModel || 'gpt-5',
                theme: result.theme || 'auto',
                panelPosition: result.panelPosition || { x: 0, y: 0 },
                panelSize: result.panelSize || { width: 500, height: 400 }
            });
        }
        catch (error)
        {
            Logger.error('Failed to load settings', error);
        }
    },

    saveSettings: async () =>
    {
        try
        {
            const state = get();
            await chrome.storage.local.set({
                openaiApiKey: state.openaiApiKey,
                n8nApiKey: state.n8nApiKey,
                n8nBaseUrl: state.n8nBaseUrl,
                selectedModel: state.selectedModel,
                theme: state.theme,
                panelPosition: state.panelPosition,
                panelSize: state.panelSize
            });
        }
        catch (error)
        {
            Logger.error('Failed to save settings', error);
        }
    }
}));
```

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
        const workflow = await WorkflowService.createWorkflow(description);
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
