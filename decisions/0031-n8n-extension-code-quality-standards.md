# Decision Record: n8n Extension Code Quality Standards

## Goal
Establish code quality standards and linting rules specifically for the n8n extension, ensuring consistency, maintainability, and type safety across all components.

## TypeScript Configuration
- **Strict mode enabled** - All strict TypeScript options are active
- **No implicit any** - Always provide explicit types
- **Exact optional properties** - Use `exactOptionalPropertyTypes: true`
- **No unused variables** - Remove unused imports and variables
- **Explicit return types** - Functions should have explicit return types

## ESLint Rules
- **Use semicolons** - Always end statements with semicolons
- **Use single quotes** - For strings, use single quotes
- **4-space indentation** - For code, 2-space for JSON
- **No console.log** - Use `console.warn` or `console.error` instead
- **Max line length** - 120 characters with exceptions for URLs and strings

## Code Style Pattern
```typescript
// Good
function handleClick(): void {
    setState(prev => ({ ...prev, value: newValue }));
}

// Bad
function handleClick() {
    setState(prev => {
        prev.value = newValue;
        return prev;
    });
}
```

## Error Handling Standards
- **Use try-catch** for async operations
- **Provide meaningful error messages**
- **Log errors** with context information
- **Handle edge cases** gracefully

## Performance Guidelines
- **Use React.memo** for expensive components (when needed)
- **Use useCallback** for event handlers passed to children
- **Use useMemo** for expensive calculations
- **Clean up event listeners** in useEffect cleanup

## File Organization
- **One component per file** - Keep components focused
- **Use descriptive names** - Component and function names should be clear
- **Group related functionality** - Keep related code together
- **Export at the bottom** - Use default exports for main components

## Comments and Documentation
- **Document complex logic** - Explain why, not what
- **Use JSDoc** for public APIs
- **Keep comments up to date** - Remove outdated comments
- **Use TODO comments** for future improvements

## n8n Extension Specific Considerations
- **Type safety** for n8n API responses and workflow data
- **Error handling** for n8n API failures and network issues
- **Performance optimization** for content script injection
- **Code organization** that supports the multi-agent architecture

## Why These Standards
- **Type safety** ensures reliable operation with n8n APIs and data structures
- **Consistent code style** improves maintainability and collaboration
- **Performance guidelines** ensure responsive user experience
- **Error handling** provides robust operation in various scenarios
- **Documentation standards** support long-term maintenance and development
