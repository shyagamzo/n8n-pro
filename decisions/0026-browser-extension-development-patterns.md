# Decision Record: Browser Extension Development Patterns for n8n Extension

## Goal
Establish Chrome/Edge browser extension development patterns specifically tailored for the n8n extension, including message passing, content script injection, and Chrome API usage.

## Chrome Extension APIs
- **chrome.runtime**: For message passing between scripts
- **chrome.storage**: For persistent data storage (sync for settings, local for cache)
- **chrome.tabs**: For tab management and URL detection
- **chrome.action**: For extension icon and popup management

## Message Passing Pattern
```typescript
// Send message
chrome.runtime.sendMessage({
    type: 'MESSAGE_TYPE',
    data: payload,
    timestamp: Date.now(),
    id: generateId()
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle message
    return true; // For async responses
});
```

## Content Script Patterns for n8n
- **Inject React apps** into n8n web pages using `createRoot`
- **Use pointer-events: none** on container, **pointer-events: auto** on interactive elements
- **Check for existing elements** before injection to prevent duplicates
- **Handle page navigation** and dynamic content loading in n8n

## Background Service Worker
- **Handle all external API calls** (n8n API, LLM providers)
- **Manage extension state** and orchestrate AI agents
- **Route messages** between content scripts and services
- **Handle extension lifecycle** events

## Storage Patterns
```typescript
// Save settings
chrome.storage.sync.set({ key: value });

// Load settings
chrome.storage.sync.get(['key'], (result) => {
    const value = result['key'] || defaultValue;
});
```

## Manifest V3 Requirements
- Use **service workers** instead of background pages
- Use **web_accessible_resources** for content script assets
- Use **host_permissions** for API access
- Use **action** instead of **browser_action**

## Security Considerations
- **Never expose API keys** in content scripts
- **Validate all messages** before processing
- **Use HTTPS** for all external API calls
- **Sanitize user input** before processing

## n8n-Specific Considerations
- **Detect n8n pages** using URL patterns and DOM elements
- **Handle n8n's dynamic content loading** and navigation
- **Integrate with n8n's existing UI** without conflicts
- **Respect n8n's security policies** and CORS requirements

## Why This Approach
- **Manifest V3 compliance** ensures future compatibility
- **Service worker architecture** provides better performance and reliability
- **Message passing pattern** enables secure communication between extension components
- **Content script injection** allows seamless integration with n8n pages
- **Storage patterns** provide persistent configuration and caching capabilities
