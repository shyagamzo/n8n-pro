# Design Tokens - CSS Variables Reference

This extension uses **n8n's CSS variables directly** for seamless visual integration and automatic theme synchronization.

## Architecture

### CSS-First Design System
All styling is done via **CSS files** using n8n's CSS variables with fallback values:

```css
.component {
    /* Use n8n's CSS variables directly */
    padding: var(--spacing-xs, 0.75rem);
    color: var(--color-text-dark, #ffffff);
    background: var(--color-background-light, #1a1a24);
}
```

**Key Points:**
- ✅ No TypeScript/JavaScript imports needed for styling
- ✅ CSS variables resolved by browser at runtime
- ✅ Automatic theme sync (light/dark mode)
- ✅ Zero JavaScript overhead

## Available CSS Variables

### Color Tokens

#### Primary Colors
```css
--color-primary                 /* Main brand color #ff6d5a */
--color-primary-shade-1         /* Darker shade #e55a47 */
--color-primary-tint-1          /* Lighter tint #ff9b8f */
--color-secondary               /* Secondary color #7c4dff */
```

**Example:**
```css
.button--primary {
    background: var(--color-primary, #ff6d5a);
}
.button--primary:hover {
    background: var(--color-primary-shade-1, #e55a47);
}
```

#### Text Colors
```css
--color-text-dark               /* White in dark mode #ffffff */
--color-text-base               /* Light gray in dark mode #c5c7d0 */
--color-text-light              /* Muted gray #7f8195 */
```

**Example:**
```css
.title {
    color: var(--color-text-dark, #ffffff);
}
.subtitle {
    color: var(--color-text-base, #c5c7d0);
}
```

#### Background Colors
```css
--color-background-light        /* Dark background in dark mode #1a1a24 */
--color-background-base         /* Secondary dark #2d2e3a */
--color-background-xlight       /* Elevated surfaces #3a3b4a */
```

**Example:**
```css
.panel {
    background: var(--color-background-light, #1a1a24);
}
.card {
    background: var(--color-background-base, #2d2e3a);
}
```

#### Border Colors
```css
--color-foreground-light        /* Border color #4f5166 */
--color-foreground-base         /* Secondary border #3a3b4a */
```

**Example:**
```css
.container {
    border: var(--border-width-base, 1px) solid var(--color-foreground-light, #4f5166);
}
```

#### Status Colors
```css
--color-success                 /* Success green #10b981 */
--color-warning                 /* Warning orange #f59e0b */
--color-danger                  /* Danger red #f44336 */
```

**Example:**
```css
.alert-success {
    border-color: var(--color-success, #10b981);
}
```

### Spacing Tokens

```css
--spacing-5xs                   /* 0.125rem (2px) */
--spacing-4xs                   /* 0.25rem (4px) */
--spacing-3xs                   /* 0.375rem (6px) */
--spacing-2xs                   /* 0.5rem (8px) */
--spacing-xs                    /* 0.75rem (12px) */
--spacing-s                     /* 1rem (16px) */
--spacing-m                     /* 1.25rem (20px) */
--spacing-l                     /* 1.5rem (24px) */
--spacing-xl                    /* 2rem (32px) */
--spacing-2xl                   /* 3rem (48px) */
--spacing-3xl                   /* 4rem (64px) */
```

**Example:**
```css
.component {
    padding: var(--spacing-xs, 0.75rem);
    margin: var(--spacing-s, 1rem);
    gap: var(--spacing-2xs, 0.5rem);
}
```

### Typography Tokens

#### Font Families
```css
--font-family                   /* InterVariable, sans-serif */
--font-family-monospace         /* CommitMono, Menlo, monospace */
```

#### Font Sizes
```css
--font-size-4xs                 /* 0.5rem (8px) */
--font-size-3xs                 /* 0.625rem (10px) */
--font-size-2xs                 /* 0.75rem (12px) */
--font-size-xs                  /* 0.8125rem (13px) */
--font-size-s                   /* 0.875rem (14px) */
--font-size-m                   /* 1rem (16px) */
--font-size-l                   /* 1.125rem (18px) */
--font-size-xl                  /* 1.25rem (20px) */
--font-size-2xl                 /* 1.75rem (28px) */
```

#### Font Weights
```css
--font-weight-regular           /* 400 */
--font-weight-medium            /* 500 */
--font-weight-bold              /* 600 */
```

#### Line Heights
```css
--font-line-height-xsmall       /* 1 */
--font-line-height-compact      /* 1.25 */
--font-line-height-regular      /* 1.3 */
--font-line-height-loose        /* 1.35 */
--font-line-height-xloose       /* 1.5 */
```

**Example:**
```css
.text {
    font-family: var(--font-family, InterVariable, sans-serif);
    font-size: var(--font-size-s, 0.875rem);
    font-weight: var(--font-weight-medium, 500);
    line-height: var(--font-line-height-loose, 1.35);
}
```

### Border Tokens

```css
--border-radius-xlarge          /* 12px */
--border-radius-large           /* 8px */
--border-radius-base            /* 4px */
--border-radius-small           /* 2px */
--border-width-base             /* 1px */
```

**Example:**
```css
.panel {
    border-radius: var(--border-radius-xlarge, 1rem);
    border-width: var(--border-width-base, 1px);
}
```

### Shadow Tokens

```css
--box-shadow-base               /* Standard elevation */
--box-shadow-dark               /* Darker shadow */
--box-shadow-light              /* Light shadow */
```

**Example:**
```css
.card {
    box-shadow: var(--shadow-base, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
}
```

### Z-Index Tokens

```css
--z-index-context-menu          /* 10 */
--z-index-app-header            /* 99 */
--z-index-modals                /* 2000 */
--z-index-toasts                /* 2100 */
--z-index-draggable             /* 9999999 */
```

**Example:**
```css
.modal {
    z-index: var(--z-index-modals, 2000);
}
```

## Usage Guidelines

### ✅ DO: Use CSS Variables Directly

```css
/* ✅ GOOD - Direct CSS variable usage */
.component {
    padding: var(--spacing-xs, 0.75rem);
    color: var(--color-text-dark, #ffffff);
    background: var(--color-background-light, #1a1a24);
}
```

### ❌ DON'T: Hardcode Values

```css
/* ❌ BAD - Hardcoded values, won't sync with theme */
.component {
    padding: 12px;
    color: #ffffff;
    background: #1a1a24;
}
```

### ✅ DO: Always Provide Fallbacks

```css
/* ✅ GOOD - Fallback ensures it works even without n8n */
color: var(--color-text-dark, #ffffff);

/* ❌ BAD - No fallback, might break */
color: var(--color-text-dark);
```

### ✅ DO: Use Semantic Token Names

```css
/* ✅ GOOD - Semantic naming */
--color-text-dark           /* Adapts to theme */
--color-background-light    /* Adapts to theme */

/* ❌ BAD - Literal naming (from old system) */
--color-white              /* Doesn't adapt */
--color-black              /* Doesn't adapt */
```

## Common Patterns

### Card Container
```css
.card {
    padding: var(--spacing-xs, 0.75rem);
    border: var(--border-width-base, 1px) solid var(--color-foreground-light, #4f5166);
    border-radius: var(--border-radius-base, 0.5rem);
    background: var(--color-background-base, #2d2e3a);
}
```

Or use the **utility class**:
```tsx
<div className="container-card">
```

### Button Styling
```css
.button {
    padding: var(--spacing-2xs, 0.5rem) var(--spacing-xs, 0.75rem);
    border-radius: var(--border-radius-base, 0.5rem);
    font-size: var(--font-size-s, 0.875rem);
    font-weight: var(--font-weight-medium, 500);
    cursor: pointer;
}
```

### Alert/Message Box
```css
.alert-warning {
    background: var(--color-background-xlight, #3a3b4a);
    border: var(--border-width-base, 1px) solid var(--color-warning, #f59e0b);
    border-radius: var(--border-radius-small, 0.25rem);
    padding: var(--spacing-2xs, 0.5rem);
    color: var(--color-text-base, #c5c7d0);
}
```

Or use the **utility class**:
```tsx
<div className="alert-warning">
```

## Utility Classes

For common patterns, use utility classes from `lib/styles/utilities.css`:

### Layout
- `.flex`, `.flex-column`, `.flex-center`, `.flex-align-center`
- `.flex-justify-between`, `.flex-1`

### Containers
- `.container-card` - Standard card pattern
- `.container-elevated` - Elevated surface
- `.section-header` - Section header pattern

### Alerts
- `.alert-warning`, `.alert-success`, `.alert-danger`, `.alert-info`

### Spacing
- `.gap-xs`, `.gap-sm`, `.gap-md`, `.gap-lg`
- `.mt-xs`, `.mt-sm`, `.mt-md`
- `.mb-xs`, `.mb-sm`, `.mb-md`

### Text
- `.text-bold`, `.text-medium`
- `.text-xs`, `.text-sm`, `.text-base`
- `.text-primary`, `.text-secondary`, `.text-muted`

### Interactive
- `.hoverable`, `.clickable`, `.draggable-handle`

See [`UTILITY-CSS-GUIDE.md`](./UTILITY-CSS-GUIDE.md) for complete utility documentation.

## File Structure

### CSS Files (Primary)
```
src/
├── lib/
│   ├── styles/
│   │   └── utilities.css          ← Reusable utility classes
│   └── components/
│       ├── Button.css             ← Component-specific styles
│       ├── Panel.css
│       └── ...
└── panel/
    └── components/
        ├── DebugPanel.css
        └── ...
```

### No tokens.ts File
**Previously:** `tokens.ts` exported TypeScript objects for inline styles
**Now:** Deleted - all styling done directly in CSS files

## Migration from Old System

### Before (TypeScript Tokens - REMOVED)
```typescript
// ❌ OLD - tokens.ts (DELETED)
import { componentTokens } from '../styles/tokens'

<div style={componentTokens.messageBubble.user}>
```

### After (CSS Variables - CURRENT)
```typescript
// ✅ NEW - CSS classes
import './MessageBubble.css'

<div className="message-bubble--user">
```

```css
/* MessageBubble.css */
.message-bubble--user {
    background: var(--color-chat-user-background, #31c4ab);
    color: var(--color-chat-user-color, #ffffff);
    padding: var(--spacing-2xs, 0.5rem) var(--spacing-xs, 0.75rem);
    border-radius: var(--border-radius-large, 0.75rem);
}
```

## Theme Synchronization

### How It Works

n8n changes CSS variables when switching themes:

```css
/* Light mode */
--color-text-dark: #2d2e3a;        /* Dark text */
--color-background-light: #ffffff; /* White background */

/* Dark mode */
--color-text-dark: #ffffff;        /* White text */
--color-background-light: #1a1a24; /* Dark background */
```

Our CSS automatically adapts:
```css
.component {
    color: var(--color-text-dark, #ffffff);           /* Updates automatically */
    background: var(--color-background-light, #1a1a24); /* Updates automatically */
}
```

**No JavaScript needed!** The browser resolves variables based on n8n's current theme.

## Complete Token Reference

For a complete list of all available CSS variables, see the actual CSS files:
- **Utilities**: [`extension/src/lib/styles/utilities.css`](./extension/src/lib/styles/utilities.css)
- **Component examples**: Any `.css` file in `extension/src/lib/components/`

For usage guidelines, see:
- **CSS Styling Patterns**: [`.cursor/rules/decisions/n8n-extension/ux/0034-css-styling-patterns.mdc`](./.cursor/rules/decisions/n8n-extension/ux/0034-css-styling-patterns.mdc)
- **Utility CSS Guide**: [`UTILITY-CSS-GUIDE.md`](./UTILITY-CSS-GUIDE.md)
- **CSS Deduplication**: [`CSS-DEDUPLICATION-EXPLAINED.md`](./CSS-DEDUPLICATION-EXPLAINED.md)

## Summary

| Aspect | Implementation |
|--------|----------------|
| **Token Format** | CSS variables: `var(--token, fallback)` |
| **Usage Location** | Directly in `.css` files |
| **TypeScript Tokens** | ❌ Not needed (deleted `tokens.ts`) |
| **Theme Sync** | ✅ Automatic (browser-native) |
| **Performance** | ✅ Zero JavaScript overhead |
| **Utilities** | ✅ Available in `utilities.css` |

**The design system IS the CSS.** No intermediary layer needed! 🎯✨
