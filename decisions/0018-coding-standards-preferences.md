# Decision Record: Coding Standards & Preferences

## Package Manager & Build Tools
- **yarn**: Use yarn for package management (confirmed in dev environment)
- **Vite**: Build tool with TypeScript and React support
- **Node.js 22**: Latest LTS version

## Language & Framework Choices
- **TypeScript**: Strict mode enabled, ^5.5.4
- **React**: ^18.3.1 for UI components
- **Zustand**: ^4.5.5 for state management
- **LangChainJS**: ^0.3.0 for AI orchestration

## Code Style & Formatting

### Core Principles
- **Separation of Concerns**: Top priority - each module/class/function should have a single, well-defined responsibility
  - **Logic vs View**: Separate business logic from presentation components
  - **Data vs Behavior**: Separate data models from business operations
  - **API vs Implementation**: Separate external interfaces from internal implementation
  - **Configuration vs Code**: Separate configuration from executable code
  - **Domain Boundaries**: Separate different business domains (agents, UI, API, storage)
  - **Layers**: Maintain clear architectural layers (presentation, business, data)
- **Small, Reusable Units**: Break down code into smaller, organized, reusable units
- **Refactor Before Extend**: When adding to large files, examine if refactoring is needed
- **Fix Root Causes**: When fixing bugs, treat the source of the problem, even at the cost of refactoring
- **Patching as Last Resort**: Use patching only as ultra-super-no-other-way last resort

### Indentation & Spacing
- **4 spaces** for indentation (except .json files)
- **2 spaces** for .json file indentation
- **No Prettier**: Custom styling rules to be defined later

### Import Organization
Imports should follow this order:
1. **Low-level packages** (e.g., `lodash`, `rxjs`)
2. **Framework packages** (e.g., `react`, `@types/chrome`)
3. **Third-party libraries** (e.g., `@langchain/openai`, `zustand`)
4. **Internal imports** (separated by one empty line)

```typescript
import { Subject             } from 'rxjs';
import { useState, useEffect } from 'react';
import { create              } from 'zustand';

import { N8nApiClient } from '../lib/api/n8n-api-client';
import { ChatPanel    } from '../components/chat-panel';
```

### Import Alignment
- Align imports vertically to the furthest closing bracket
- Internal imports ordered from least close to closest

### Object Properties & Assignment Alignment
```typescript
const someValue    = 1;
const anotherValue = 2;
const config       = {
    someKey   : 'value',
    anotherKey: 'anotherValue'
};
```

### Braces & Control Structures
- **Opening braces on new line**:

```typescript
function doMagic(): void
{
    if (somethingCoolHappened)
    {
        sparkTheAir();
        return;
    }
    
    goToSleep();
}
```

### Switch Statements
- **Avoid switch statements** when possible, use mapping objects:

```typescript
enum AgentType { Classifier, Enrichment, Planner, Executor }

class AgentRouter
{
    private handlers = {
        [AgentType.Classifier]: this.handleClassifier.bind(this),
        [AgentType.Enrichment]: this.handleEnrichment.bind(this),
        [AgentType.Planner]: this.handlePlanner.bind(this),
        [AgentType.Executor]: this.handleExecutor.bind(this)
    };

    public routeAgent(type: AgentType): void
    {
        this.handlers[type]();
    }
}
```

### Line Grouping
Separate lines into logical groups:
- **Assignments**
- **Control blocks content** (loops, conditions)
- **Return statements**
- **Same-topic operations**

```typescript
function createWorkflow(description: string): Workflow
{
    const isComplex = description.includes('complex');
    const nodeCount = estimateNodeCount(description);
    // ⤵
    validateDescription(description);
    checkCredentials();
    // ⤵
    if (isComplex)
    {
        const plan = createComplexPlan(description);
        // ⤵
        executePlan(plan);
        logSuccess('Complex workflow created');
        // ⤵
        return plan.workflow;
    }
    // ⤵
    const simpleWorkflow = createSimpleWorkflow(description);
    // ⤵
    saveWorkflow(simpleWorkflow);
    notifyUser('Workflow created');
    // ⤵
    return simpleWorkflow;
}
```

## TypeScript Standards

### Type Safety
- **Strong typing**: Type all variables whenever possible
- **Return types**: Always state return type of functions/methods
- **Strict mode**: Enable strict TypeScript configuration

### Function Design
- **Break complex functions** into smaller, meaningful functions
- **Meaningful names**: Use descriptive and explanatory names
- **Single responsibility**: Each function should do one thing well
- **Reusable Units**: Design functions to be reusable across different contexts
- **Clear Boundaries**: Functions should have clear input/output contracts
- **No Side Effects**: Prefer pure functions when possible

## File & Folder Structure

### Project Organization (Separation of Concerns)
```
src/
├── background/          # Service worker (orchestration layer)
├── content/            # Content scripts (injection layer)
├── panel/              # React panel UI (presentation layer)
├── options/            # Options page (configuration layer)
├── lib/                # Shared utilities (business logic layer)
│   ├── api/           # API clients (data access layer)
│   ├── agents/        # AI agents (business logic layer)
│   ├── components/    # Shared components (presentation layer)
│   ├── services/      # Business services (business logic layer)
│   ├── models/        # Data models (data layer)
│   ├── utils/         # Pure utilities (utility layer)
│   └── types/         # TypeScript types (contract layer)
└── __tests__/         # Test files (testing layer)
```

### Architectural Layers
- **Presentation Layer**: UI components, panels, options pages
- **Business Logic Layer**: Agents, services, workflow orchestration
- **Data Access Layer**: API clients, storage, external integrations
- **Data Layer**: Models, types, data structures
- **Utility Layer**: Pure functions, helpers, validators
- **Configuration Layer**: Settings, environment, constants

### Naming Conventions
- **Files**: kebab-case (e.g., `chat-panel.tsx`)
- **Components**: PascalCase (e.g., `ChatPanel`)
- **Functions/Variables**: camelCase (e.g., `createWorkflow`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types/Interfaces**: PascalCase (e.g., `WorkflowConfig`)

## Testing Strategy

### Unit Testing
- **Test public API only**
- **Test expected behavior**, not implementation
- **Meaningful test names**: Describe what is being tested
- **Small, focused tests**: One concept per test

### Test Structure
```typescript
describe('WorkflowCreator', () =>
{
    describe('createWorkflow', () =>
    {
        it('should create simple workflow from description', () =>
        {
            // Arrange
            const description = 'Send email when form submitted';
            
            // Act
            const workflow = workflowCreator.createWorkflow(description);
            
            // Assert
            expect(workflow.nodes).toHaveLength(2);
            expect(workflow.nodes[0].type).toBe('Webhook');
        });
    });
});
```

## Error Handling & Logging

### Error Handling
- **Graceful degradation**: Handle errors without crashing
- **User-friendly messages**: Clear error messages for users
- **Logging**: Log errors for debugging (no sensitive data)

### Logging Strategy
```typescript
class Logger
{
    public static error(message: string, error?: Error): void
    {
        console.error(`[ERROR] ${message}`, error);
    }
    
    public static info(message: string): void
    {
        console.info(`[INFO] ${message}`);
    }
}
```

## State Management

### Zustand Patterns
- **Small, focused stores**: One store per domain
- **Immutable updates**: Use immer for complex state updates
- **Type safety**: Strongly typed store interfaces

```typescript
interface ChatStore
{
    messages: Message[];
    isLoading: boolean;
    addMessage: (message: Message) => void;
    setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
    messages: [],
    isLoading: false,
    addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
    })),
    setLoading: (loading) => set({ isLoading: loading })
}));
```

## API & Data Layer

### HTTP Client
- **Custom fetch wrapper**: Tailored to extension needs
- **Error handling**: Consistent error handling across API calls
- **Type safety**: Strongly typed request/response interfaces

### Data Validation
- **Input validation**: Validate all user inputs
- **Response validation**: Validate API responses
- **Type guards**: Use type guards for runtime type checking

## Documentation Standards

### Inline Documentation
- **JSDoc style**: Document all public APIs
- **Explain "why"**: Provide context and reasoning
- **Examples**: Include usage examples where helpful

```typescript
/**
 * Creates a new workflow based on user description
 * @param description - Natural language description of the workflow
 * @param options - Optional configuration for workflow creation
 * @returns Promise resolving to the created workflow
 * @throws {ValidationError} When description is invalid
 * @example
 * ```typescript
 * const workflow = await createWorkflow('Send email when form submitted');
 * ```
 */
async function createWorkflow(
    description: string, 
    options?: WorkflowOptions
): Promise<Workflow>
{
    // Implementation
}
```

### README Structure
- **TLDR Summary**: Quick overview at the top
- **Installation**: Clear setup instructions
- **Usage**: Examples and common patterns
- **API Reference**: Link to detailed documentation

## Git Workflow & CI/CD

### Commit Standards
- **Small, precise commits**: One logical change per commit
- **Emoji prefixes**: Use relevant emojis for commit types
- **Descriptive messages**: Answer "what did you do?"

### Commit Emoji Map
| Emoji | Use when... |
|-------|-------------|
| ✨ | Scaffolded new component/service |
| 🐛 | Fixed a bug |
| ➕ | Added new feature |
| ➖ | Removed feature |
| ♻️ | Refactored code |
| 🎨 | Improved code structure |
| ⚡ | Performance optimization |
| 📃 | Documentation changes |
| 🔧 | Configuration changes |
| 💄 | UI/styling improvements |
| 📦 | Dependency updates |
| ✅ | Added/modified tests |
| 🤖 | AI instructions, Cursor rules, agent configurations |
| 💭 | Decisions, brainstorms, planning documentation |

### Branch Naming
- **Format**: `<emoji>/<module>/<feature-name>`
- **Example**: `➕/panel/chat-interface`

## Refactoring Guidelines

### When to Refactor
- **Large Files**: When files exceed ~300 lines, consider breaking them down
- **Before Adding Features**: Examine if new functionality fits existing structure
- **After Bug Fixes**: If bug reveals structural issues, refactor to prevent recurrence
- **Code Smells**: Duplicate code, long parameter lists, complex conditionals

### Refactoring Process
1. **Identify the Problem**: What is the root cause?
2. **Plan the Refactor**: How can we improve the structure?
3. **Extract Reusable Units**: Break down into smaller, focused modules
4. **Separate Concerns**: Move logic out of view components
5. **Test Thoroughly**: Ensure functionality remains intact

### Anti-Patterns to Avoid
- **Patching**: Quick fixes that don't address root causes
- **God Objects**: Classes/components that do too much
- **Tight Coupling**: Dependencies that make testing and reuse difficult
- **Mixed Concerns**: Business logic mixed with presentation logic
- **Leaky Abstractions**: Implementation details leaking through interfaces
- **Circular Dependencies**: Modules depending on each other in cycles
- **Fat Controllers**: Components handling too many responsibilities
- **Service Locators**: Hidden dependencies and global state

## Open Items
- **ESLint Configuration**: Define specific ESLint rules
- **Custom Styling Rules**: Define formatting rules (no Prettier)
- **CI/CD Pipeline**: GitHub Actions configuration
- **Code Review Process**: Review guidelines and checklist
