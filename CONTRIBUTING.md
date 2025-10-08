# Contributing to n8n Pro Extension

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Decision Documents](#decision-documents)

---

## Code of Conduct

### Our Standards

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Inclusive**: Welcome contributors of all backgrounds
- **Be Professional**: Maintain professionalism in all interactions

### Reporting Issues

Report unacceptable behavior to [maintainer email].

---

## Getting Started

### Prerequisites

- **Node.js 22** or later
- **yarn** package manager
- **Git** for version control
- **Chrome/Edge** browser for testing
- **n8n instance** (local or cloud)

### Setup Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd n8n-pro

# Install dependencies
cd extension
yarn install

# Start development build with watch mode
yarn watch

# In another terminal, start n8n
docker run -it --rm -p 5678:5678 n8nio/n8n
```

### Load Extension for Testing

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/dist` folder
5. Navigate to `http://localhost:5678`

---

## Development Workflow

### 1. Create a Branch

Use emoji-prefixed branch names:

```bash
# New feature
git checkout -b ✨/your-feature-name

# Bug fix
git checkout -b 🐛/bug-description

# Refactoring
git checkout -b ♻️/refactor-name

# Documentation
git checkout -b 📚/doc-update
```

### 2. Make Changes

- Follow coding standards (see below)
- Write clear, descriptive code
- Add comments for complex logic
- Update documentation as needed

### 3. Commit Changes

Use emoji-prefixed commit messages:

```bash
# Examples
git commit -m "✨ Add workflow template support"
git commit -m "🐛 Fix credential detection bug"
git commit -m "♻️ Refactor orchestrator logic"
git commit -m "📚 Update API documentation"
```

### Commit Emoji Guide

| Emoji | Code | Use When |
|-------|------|----------|
| ✨ | `:sparkles:` | New feature or component |
| 🐛 | `:bug:` | Bug fix |
| ➕ | `:heavy_plus_sign:` | Add files/dependencies |
| ➖ | `:heavy_minus_sign:` | Remove files/dependencies |
| ♻️ | `:recycle:` | Refactoring |
| 📂 | `:open_file_folder:` | Restructure folders |
| 🎨 | `:art:` | Improve code structure |
| ⚡ | `:zap:` | Performance improvement |
| 📚 | `:books:` | Documentation |
| 🚀 | `:rocket:` | Deployment/release |
| 🔧 | `:wrench:` | Configuration |
| 💄 | `:lipstick:` | UI/styling |
| 🔐 | `:closed_lock_with_key:` | Security |
| 🐳 | `:whale:` | Docker/containers |

### 4. Test Your Changes

```bash
# Build the extension
yarn build

# Reload extension in Chrome
# Test manually following TESTING-GUIDE.md

# Run linter
yarn lint

# Fix lint errors
yarn lint --fix
```

---

## Coding Standards

### TypeScript Guidelines

#### Strict Mode
```typescript
// ✅ Good: Explicit types
function createWorkflow(name: string, nodes: Node[]): Workflow {
  // ...
}

// ❌ Bad: Implicit any
function createWorkflow(name, nodes) {
  // ...
}
```

#### Naming Conventions
```typescript
// ✅ Good: Descriptive names
const userMessage = "Hello"
async function fetchWorkflows(): Promise<Workflow[]>

// ❌ Bad: Generic/unclear names
const data = "Hello"
async function get(): Promise<any>
```

#### Error Handling
```typescript
// ✅ Good: Specific error handling
try {
  await api.createWorkflow(workflow)
} catch (error) {
  if (error instanceof N8nApiError) {
    logger.error('n8n API error', error)
    throw error
  }
  throw new UnexpectedError('Workflow creation failed', error)
}

// ❌ Bad: Silent failures
try {
  await api.createWorkflow(workflow)
} catch (error) {
  console.log('Error:', error)
}
```

### React Guidelines

#### Component Structure
```typescript
// ✅ Good: Props interface, clear component
interface MessageProps {
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

export function Message({ text, sender, timestamp }: MessageProps): React.ReactElement {
  return <div className={`message-${sender}`}>{text}</div>
}

// ❌ Bad: Inline types, unclear props
export function Message(props: any) {
  return <div>{props.text}</div>
}
```

#### Hooks
```typescript
// ✅ Good: Custom hooks with clear purpose
function useChatMessages() {
  const messages = useStore(state => state.messages)
  const addMessage = useStore(state => state.addMessage)
  return { messages, addMessage }
}

// ❌ Bad: Direct store access in components
const Component = () => {
  const store = useStore()
  // ...
}
```

### Code Organization

#### Import Order
```typescript
// 1. Low-level packages
import { debounce } from 'lodash'

// 2. Framework packages
import React, { useState } from 'react'
import type { ChatMessage } from '@types/chrome'

// 3. Third-party libraries
import { ChatOpenAI } from '@langchain/openai'
import { create } from 'zustand'

// (blank line)

// 4. Internal imports
import { logger } from '../services/logger'
import { createN8nClient } from '../n8n'
import type { Plan } from '../types/plan'
```

#### File Structure
```typescript
// 1. Imports
import ...

// 2. Types and interfaces
export type MyType = ...
export interface MyInterface { ... }

// 3. Constants
const MY_CONSTANT = ...

// 4. Helper functions
function helperFunction() { ... }

// 5. Main exports
export class MyClass { ... }
export function myFunction() { ... }
```

### Documentation

#### Function Documentation
```typescript
/**
 * Create a new workflow in n8n.
 * 
 * @param workflow - Workflow definition with nodes and connections
 * @returns Promise with created workflow ID
 * @throws {N8nApiError} If API request fails
 * @throws {ValidationError} If workflow is invalid
 * 
 * @example
 * ```typescript
 * const result = await createWorkflow({
 *   name: 'My Workflow',
 *   nodes: [...]
 * })
 * console.log(result.id)
 * ```
 */
export async function createWorkflow(workflow: WorkflowDef): Promise<{ id: string }> {
  // ...
}
```

#### Complex Logic Comments
```typescript
// ✅ Good: Explain WHY, not WHAT
// Use exponential backoff to avoid overwhelming the API during transient failures
const delay = Math.pow(2, attempt) * 1000

// ❌ Bad: Obvious comments
// Multiply 2 by attempt and then by 1000
const delay = Math.pow(2, attempt) * 1000
```

---

## Testing

### Manual Testing

Follow the comprehensive testing guide in [TESTING-GUIDE.md](TESTING-GUIDE.md).

**Key Test Scenarios:**
1. Extension setup and configuration
2. Basic chat interaction
3. Simple workflow creation
4. Complex workflow with credentials
5. Error handling
6. Edge cases

### Automated Testing (Future)

When test infrastructure is ready:

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Manual testing completed
- [ ] No lint errors
- [ ] Decision document created (if needed)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
Describe testing performed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed
- [ ] Documentation updated
- [ ] Manual testing completed
```

### Review Process

1. **Automated Checks**: Lint and build must pass
2. **Code Review**: At least one approval required
3. **Testing**: Reviewer tests changes locally
4. **Approval**: PR approved by maintainer
5. **Merge**: Squash and merge to keep history clean

---

## Decision Documents

### When to Create

Create a decision document when:
- Making architectural choices
- Selecting technologies or frameworks
- Defining processes or workflows
- Resolving conflicts between approaches
- Establishing patterns or conventions

### Document Structure

```markdown
# Decision: [Brief Title]

## Context
Background and problem statement

## Decision
What was decided

## Implementation Details
How it will be implemented

## Alternatives Considered
Other options that were evaluated

## Consequences
Positive and negative outcomes

## References
Links to related decisions, documentation, or code
```

### Location

`.cursor/rules/decisions/n8n-extension/<category>/<number>-<slug>.mdc`

**Categories:**
- `architecture/`: System design and patterns
- `api/`: API integration
- `ux/`: User experience
- `use-cases/`: Feature scenarios
- `browser-extension/`: Extension patterns
- `security/`: Security and privacy
- `governance/`: Development workflow

---

## Communication

### Discussions

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code reviews and implementation details

### Response Times

- **Bug Reports**: 1-3 days
- **Feature Requests**: 1 week
- **Pull Requests**: 3-7 days

---

## Recognition

Contributors are recognized in:
- Release notes
- README contributors section
- Git commit history

---

## Resources

- [Project README](README.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [Testing Guide](TESTING-GUIDE.md)
- [Decision Documents](.cursor/rules/decisions/)

---

## Questions?

If you have questions about contributing:
1. Check existing documentation
2. Search closed issues
3. Open a new discussion
4. Contact maintainers

---

**Thank you for contributing!** 🎉
