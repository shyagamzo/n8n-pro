# Utility CSS Guide

## Overview

We now have **two approaches** for styling:

1. **Utility CSS** (`lib/styles/utilities.css`) - Reusable utility classes
2. **Component CSS** (e.g., `Button.css`) - Component-specific styling

## When to Use Each

### Use Utility Classes When:

✅ **The pattern is used in 3+ places**
```tsx
// ✅ GOOD - Common flex pattern
<div className="flex-justify-between">
```

✅ **It's a simple, single-purpose style**
```tsx
// ✅ GOOD - Simple spacing
<div className="mt-sm gap-md">
```

✅ **You need quick layout adjustments**
```tsx
// ✅ GOOD - Layout utilities
<div className="flex-column w-full">
```

### Use Component CSS When:

✅ **The style is specific to that component**
```css
/* ✅ GOOD - Button-specific hover state */
.button--primary:hover {
    background: var(--color-primary-shade, #e55a47);
}
```

✅ **Multiple properties form a cohesive pattern**
```css
/* ✅ GOOD - Complete component style */
.message-bubble--user {
    background: var(--color-chat-user-background, #31c4ab);
    color: var(--color-chat-user-color, #ffffff);
    padding: var(--spacing-2xs, 0.5rem) var(--spacing-xs, 0.75rem);
    border-radius: var(--border-radius-large, 0.75rem);
}
```

✅ **The styling is complex or interactive**
```css
/* ✅ GOOD - Complex interaction */
.panel-resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, var(--color-foreground-light, #4f5166) 50%);
}
```

## Available Utility Categories

### Layout Utilities
- **Flexbox**: `.flex`, `.flex-column`, `.flex-center`, `.flex-align-center`, `.flex-justify-between`
- **Sizing**: `.flex-1`, `.w-full`, `.max-w-full`
- **Overflow**: `.overflow-hidden`, `.overflow-auto`, `.overflow-y-auto`

### Container Patterns
- **Cards**: `.container-card` - Standard card-like container
- **Elevated**: `.container-elevated` - Lighter background container
- **Headers**: `.section-header`, `.section-header-title`

### Button Utilities
- **Base**: `.btn` - Base button reset
- **Variants**: `.btn-icon`, `.btn-small`
- **Disabled**: Automatic `:disabled` state

### Text Utilities
- **Weight**: `.text-bold`, `.text-medium`
- **Size**: `.text-xs`, `.text-sm`, `.text-base`
- **Color**: `.text-primary`, `.text-secondary`, `.text-muted`

### Spacing Utilities
- **Gap**: `.gap-xs`, `.gap-sm`, `.gap-md`, `.gap-lg`
- **Margin Top**: `.mt-xs`, `.mt-sm`, `.mt-md`
- **Margin Bottom**: `.mb-xs`, `.mb-sm`, `.mb-md`

### Alert/Status Patterns
- **Alerts**: `.alert-warning`, `.alert-success`, `.alert-danger`, `.alert-info`

### Interactive Utilities
- **Hoverable**: `.hoverable` - Background change on hover
- **Clickable**: `.clickable` - Cursor pointer + user-select
- **Draggable**: `.draggable-handle` - Cursor move + user-select

### Code Patterns
- **Inline**: `.code-inline` - Inline code styling
- **Block**: `.code-block` - Code block with scrolling

### Border Utilities
- **Borders**: `.border`, `.border-top`, `.border-bottom`
- **Radius**: `.rounded`, `.rounded-sm`, `.rounded-lg`

## Usage Examples

### Before: Repeated Patterns
```css
/* ❌ BAD - Repeated in multiple files */
/* PlanMessage.css */
.plan-message-container {
    padding: var(--spacing-xs, 0.75rem);
    border: var(--border-width-base, 1px) solid var(--color-foreground-light, #4f5166);
    border-radius: var(--border-radius-base, 0.5rem);
    background: var(--color-background-base, #2d2e3a);
}

/* DebugPanel.css */
.debug-panel {
    border: var(--border-width-base, 1px) solid var(--color-foreground-light, #4f5166);
    border-radius: var(--border-radius-base, 0.5rem);
    background: var(--color-background-base, #2d2e3a);
    /* ... */
}
```

### After: Reusable Utilities
```tsx
// ✅ GOOD - Use utility class
import 'lib/styles/utilities.css'

<div className="container-card">
    {/* Component-specific content */}
</div>
```

### Combining Utilities with Component CSS

```tsx
// Component.tsx
import './Component.css'
import '../lib/styles/utilities.css'

export default function Component() {
    return (
        <div className="component container-card">
            <header className="flex-justify-between mb-sm">
                <h3 className="text-bold">Title</h3>
                <button className="btn-icon">×</button>
            </header>
            <div className="component__content">
                {/* Component-specific elements */}
            </div>
        </div>
    )
}
```

```css
/* Component.css - Only component-specific styles */
.component__content {
    /* Specific content styling */
    background: linear-gradient(...);
    animation: fadeIn 0.3s ease;
}

.component__special-element {
    /* Unique to this component */
}
```

## Migration Strategy

### Step 1: Identify Repeated Patterns
Look for CSS patterns repeated in 3+ files:
```bash
# Search for common patterns
grep -r "padding: var(--spacing-xs" src/
grep -r "border-radius: var(--border-radius-base" src/
```

### Step 2: Replace with Utilities
```tsx
// BEFORE
<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

// AFTER
<div className="flex-align-center gap-sm">
```

### Step 3: Keep Component-Specific Styles
```css
/* KEEP - Unique to Button component */
.button--primary:hover {
    background: var(--color-primary-shade, #e55a47);
    transform: scale(1.02);
}
```

## Design Principles

### 1. **Utility Classes Are Single-Purpose**
```css
/* ✅ GOOD - Single purpose */
.gap-sm { gap: var(--spacing-2xs, 0.5rem); }

/* ❌ BAD - Multiple responsibilities */
.card { padding: ...; border: ...; background: ...; box-shadow: ...; }
/* Use .container-card instead */
```

### 2. **Component Classes Are Multi-Purpose**
```css
/* ✅ GOOD - Complete component style */
.button {
    padding: var(--spacing-2xs, 0.5rem) var(--spacing-xs, 0.75rem);
    border-radius: var(--border-radius-base, 0.5rem);
    cursor: pointer;
    font-size: var(--font-size-s, 0.875rem);
    /* Multiple properties that work together */
}
```

### 3. **Utilities Don't Replace Component CSS**
```tsx
// ❌ BAD - Too many utilities, hard to read
<button className="btn p-xs-2xs rounded cursor-pointer text-sm bg-primary text-white">

// ✅ GOOD - Component class + utility for layout
<button className="button button--primary mt-sm">
```

## Benefits

### Code Reuse
- ✅ Write once, use everywhere
- ✅ Consistent spacing, colors, typography
- ✅ Smaller CSS bundle (shared utilities)

### Maintainability
- ✅ Single source of truth for common patterns
- ✅ Easy to update (change utility, affects all usages)
- ✅ Clear separation: utilities vs component-specific

### Developer Experience
- ✅ Faster development (no need to write common CSS)
- ✅ Better readability (`.flex-center` vs 3 CSS properties)
- ✅ Consistent patterns across codebase

## Anti-Patterns

### ❌ Don't Replace All Component CSS
```tsx
// ❌ BAD - Utility soup
<div className="p-xs border rounded bg-base text-primary font-bold text-sm mb-sm mt-xs">
```

### ❌ Don't Create Ultra-Specific Utilities
```css
/* ❌ BAD - Too specific */
.button-primary-with-icon-and-shadow {
    /* This should be a component class */
}
```

### ❌ Don't Duplicate Utilities in Component CSS
```css
/* ❌ BAD - Already have .flex-center utility */
.my-component {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ✅ GOOD - Use utility in JSX instead */
<div className="my-component flex-center">
```

## Summary

| Pattern Type | Use Utility CSS | Use Component CSS |
|--------------|-----------------|-------------------|
| Common layout | ✅ Yes | ❌ No |
| Simple spacing | ✅ Yes | ❌ No |
| Repeated patterns | ✅ Yes (if 3+ uses) | ❌ No |
| Component-specific | ❌ No | ✅ Yes |
| Complex interactions | ❌ No | ✅ Yes |
| Unique styling | ❌ No | ✅ Yes |

**Golden Rule:** Use utilities for **common patterns**, use component CSS for **unique behaviors**.

