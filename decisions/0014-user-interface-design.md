# Decision Record: User Interface Design - Chatbot Panel

## Panel Layout & Structure

### Floating Panel Design (MVP)
- **Position**: Fixed floating panel that overlays n8n editor without blocking workflow canvas
- **Size**: Fixed size (e.g., 500x400px) - resizable deferred to future version
- **Positioning**: Fixed position (top-right) - draggable deferred to future version
- **Z-index**: Above n8n UI but below browser dev tools

### Panel Components
```
┌─────────────────────────────────┐
│ Header: n8n AI Assistant        │
├─────────────────────────────────┤
│ Chat Messages Area              │
│ ┌─────────────────────────────┐ │
│ │ User: Create a workflow...  │ │
│ │ Bot: I'll help you...       │ │
│ │ [Workflow Diff Preview]     │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Input Area                      │
│ ┌─────────────────────────────┐ │
│ │ Type your message...        │ │
│ │ [Send] [Attach]             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## Chat Interface

### Message Types (MVP)
- **User messages**: Text input with timestamp
- **Bot responses**: Streaming text with typing indicators
- **Workflow diffs**: Simple text-based preview of changes before applying
- **Credential guidance**: Non-interruptive setup buttons
- **Error messages**: Clear, actionable error states

### Interaction Patterns (MVP)
- **Streaming responses**: Real-time text streaming from AI agents
- **Typing indicators**: Show when AI is processing
- **Message history**: Scrollable chat (session-only)
- **Quick actions**: Basic buttons (Apply, Reject) - advanced actions deferred

## Workflow Visualization (Deferred)
- **Visual diff preview**: Deferred to future version
- **Color coding**: Deferred to future version
- **Node details**: Deferred to future version
- **Connection preview**: Deferred to future version
- **Workflow status**: Deferred to future version
- **Progress indicators**: Deferred to future version
- **Error highlighting**: Deferred to future version

### MVP Alternative
- **Text-based preview**: Simple text description of workflow changes
- **Basic status**: Success/failure messages only

## Non-Interruptive UX Elements

### Credential Setup
- **Detection**: Automatically detect missing credentials
- **Optional buttons**: "Set up Gmail credentials" (non-blocking)
- **Parallel guidance**: Opens in separate panel/tab
- **Status indicators**: Show credential status without interrupting flow

### Suggestion Cards (Deferred)
- **Workflow ideas**: Deferred to future version
- **Quick preview**: Deferred to future version
- **One-click creation**: Deferred to future version

## Visual Design

### Proprietary Design System
- **Component library**: Custom React components (Button, Input, Card, etc.)
- **n8n value reuse**: Read n8n's CSS variables and apply to our design tokens
- **Design tokens**: Semantic tokens (--app-primary, --app-surface, --app-text) mapped from n8n variables
- **Consistent styling**: All components use the same design system
- **Theme sync**: Automatic updates when n8n theme changes

### Responsive Design (Deferred)
- **Mobile-friendly**: Deferred to future version
- **Touch support**: Deferred to future version
- **Keyboard shortcuts**: Basic shortcuts only (Enter to send, Escape to close)

## State Management

### Chat State
- **Message history**: Session-only (deferred: persistent across panel open/close)
- **Typing state**: Track user input and AI processing
- **Workflow context**: Current workflow being modified
- **Credential status**: Track setup progress

### UI State (MVP)
- **Panel position**: Fixed position (top-right)
- **Panel size**: Fixed size
- **Theme mode**: Sync with n8n's light/dark mode
- **Collapse state**: Basic show/hide - minimize/maximize deferred

## Accessibility (Deferred)
- **ARIA support**: Deferred to future version
- **Screen reader support**: Deferred to future version
- **Keyboard navigation**: Basic tab order and shortcuts (Enter to send, Escape to close)

## Performance Considerations (MVP)
- **Basic scrolling**: Standard scroll for chat history
- **Simple loading**: Basic loading states
- **Debounced input**: Prevent excessive API calls
- **Basic cleanup**: Clean up event listeners on unmount

### Deferred Optimizations
- **Virtual scrolling**: Deferred to future version
- **Lazy loading**: Deferred to future version
- **Memoization**: Deferred to future version
- **Advanced memory management**: Deferred to future version
