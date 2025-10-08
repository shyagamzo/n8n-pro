# Design Tokens Documentation

This extension uses a comprehensive design token system that synchronizes with n8n's design language.

## Philosophy

**Design tokens** are named variables that store visual design attributes. They create a single source of truth for:
- Colors
- Spacing
- Typography
- Borders
- Shadows
- Layout values

## Benefits

1. **Consistency**: All components use the same visual language
2. **Theme Sync**: Automatically inherits n8n's design when available
3. **Maintainability**: Change tokens in one place, update everywhere
4. **Semantic Naming**: `colors.textBase` is clearer than `#555770`
5. **Graceful Fallbacks**: Works even when n8n tokens aren't available

## Token Categories

### Colors

#### Primary Colors
```typescript
colors.primary              // Main brand color (#ff6d5a)
colors.primaryShade         // Darker shade for hover states
colors.primaryTint          // Lighter tint for backgrounds
```

#### Text Colors
```typescript
colors.textDark             // Headings, emphasis (#2d2e3a)
colors.textBase             // Body text (#555770)
colors.textLight            // Secondary text (#7f8195)
colors.textXLight           // White text for dark backgrounds
```

#### Background Colors
```typescript
colors.backgroundDark       // Dark surfaces
colors.backgroundBase       // Default surface (#f5f6f8)
colors.backgroundLight      // Light surface
colors.backgroundXLight     // Pure white
```

#### Chat-Specific Colors
```typescript
colors.chatUserBackground   // User message bubble (#31c4ab)
colors.chatUserColor        // User message text (#ffffff)
colors.chatBotBackground    // Assistant message bubble (#ffffff)
```

#### Status Colors
```typescript
colors.success              // Success states (#4caf50)
colors.warning              // Warning states (#f59e0b)
colors.danger               // Error/danger states (#f44336)
```

### Spacing

Consistent spacing scale from 2px to 256px:

```typescript
spacing['5xs']  // 0.125rem (2px)  - Tiny gaps
spacing['4xs']  // 0.25rem (4px)   - Small gaps
spacing['3xs']  // 0.375rem (6px)  
spacing['2xs']  // 0.5rem (8px)    - Compact spacing
spacing.xs      // 0.75rem (12px)  - Default small
spacing.s       // 1rem (16px)     - Default medium
spacing.m       // 1.25rem (20px)  - Default large
spacing.l       // 1.5rem (24px)   
spacing.xl      // 2rem (32px)     - Large spacing
spacing['2xl']  // 3rem (48px)     
spacing['3xl']  // 4rem (64px)     - Section spacing
```

### Typography

#### Font Families
```typescript
typography.fontFamily       // InterVariable, sans-serif
typography.fontFamilyMono   // CommitMono, monospace
```

#### Font Sizes
```typescript
typography.fontSize2xs      // 0.75rem (12px)  - Small labels
typography.fontSizeXs       // 0.8125rem (13px)
typography.fontSizeS        // 0.875rem (14px) - Body text
typography.fontSizeM        // 1rem (16px)     - Default
typography.fontSizeL        // 1.125rem (18px) - Large text
typography.fontSizeXl       // 1.25rem (20px)  - Headings
typography.fontSize2xl      // 1.75rem (28px)  - Large headings
```

#### Font Weights
```typescript
typography.fontWeightRegular  // 400 - Body text
typography.fontWeightMedium   // 500 - Emphasis
typography.fontWeightBold     // 600 - Headings
```

#### Line Heights
```typescript
typography.lineHeightCompact   // 1.25 - Tight spacing
typography.lineHeightRegular   // 1.3  - Default
typography.lineHeightLoose     // 1.35 - Comfortable
typography.lineHeightXLoose    // 1.5  - Very readable
```

### Borders

```typescript
borders.radiusXLarge        // 12px - Large panels
borders.radiusLarge         // 8px  - Buttons, inputs
borders.radiusBase          // 4px  - Default
borders.radiusSmall         // 2px  - Subtle rounding

borders.colorBase           // Default border color
borders.colorLight          // Light border color
borders.widthBase           // 1px

borders.base                // Complete border definition
```

### Shadows

```typescript
shadows.base    // Default shadow for cards
shadows.light   // Subtle shadow for floating elements
shadows.dark    // Prominent shadow for modals
```

### Z-Index

Proper layering system:

```typescript
zIndex.contextMenu          // 10
zIndex.appHeader            // 99
zIndex.askAssistantChat     // 300    - Our chat panel
zIndex.modals               // 2000
zIndex.toasts               // 2100
zIndex.askAssistantButton   // 3000   - Our trigger button
```

## Component Tokens

Pre-configured token combinations for common components:

### Message Bubbles

```typescript
// User messages
componentTokens.messageBubble.user = {
  background: colors.chatUserBackground,
  color: colors.chatUserColor,
  padding: `${spacing['2xs']} ${spacing.xs}`,
  borderRadius: borders.radiusLarge,
}

// Assistant messages
componentTokens.messageBubble.assistant = {
  background: colors.chatBotBackground,
  color: colors.textBase,
  padding: `${spacing['2xs']} ${spacing.xs}`,
  borderRadius: borders.radiusLarge,
}
```

### Inputs/Textareas

```typescript
componentTokens.input = {
  padding: `${spacing['2xs']} ${spacing.xs}`,
  borderRadius: borders.radiusLarge,
  border: `${borders.widthBase} solid ${borders.colorBase}`,
  fontSize: typography.fontSizeS,
  fontFamily: typography.fontFamily,
}
```

### Buttons

```typescript
// Primary button
componentTokens.button.primary = {
  background: colors.primary,
  color: colors.textXLight,
  padding: `${spacing['2xs']} ${spacing.s}`,
  borderRadius: borders.radiusBase,
  fontWeight: typography.fontWeightMedium,
}

// Secondary button
componentTokens.button.secondary = {
  background: colors.backgroundXLight,
  color: colors.textBase,
  border: `${borders.widthBase} solid ${borders.colorBase}`,
  padding: `${spacing['2xs']} ${spacing.s}`,
  borderRadius: borders.radiusBase,
  fontWeight: typography.fontWeightMedium,
}
```

## Usage Examples

### Basic Component

```typescript
import { colors, spacing, borders } from '../lib/styles/tokens'

function MyComponent() {
  return (
    <div style={{
      background: colors.backgroundXLight,
      padding: spacing.s,
      borderRadius: borders.radiusLarge,
      border: `${borders.widthBase} solid ${borders.colorBase}`,
      color: colors.textBase,
    }}>
      Hello World
    </div>
  )
}
```

### Using Component Tokens

```typescript
import { componentTokens } from '../lib/styles/tokens'

function MessageBubble({ role, text }) {
  const style = role === 'user' 
    ? componentTokens.messageBubble.user
    : componentTokens.messageBubble.assistant
  
  return <div style={style}>{text}</div>
}
```

### Combining Tokens

```typescript
import { spacing, colors, typography } from '../lib/styles/tokens'

const customStyle = {
  padding: `${spacing.s} ${spacing.m}`,
  background: colors.primary,
  color: colors.textXLight,
  fontSize: typography.fontSizeL,
  fontWeight: typography.fontWeightBold,
}
```

## Token Mapping to n8n

Our tokens map to n8n's CSS variables:

| Our Token | n8n Variable | Fallback |
|-----------|--------------|----------|
| `colors.primary` | `--color-primary` | `#ff6d5a` |
| `colors.textBase` | `--color-text-base` | `#555770` |
| `spacing.s` | `--spacing-s` | `1rem` |
| `borders.radiusLarge` | `--border-radius-large` | `8px` |

When running inside n8n, our extension automatically picks up their theme values. When running standalone, fallback values are used.

## Best Practices

### ✅ DO

- Use semantic token names: `colors.textBase` not `colors.gray540`
- Use component tokens when available
- Combine tokens for custom styles
- Use spacing tokens for consistent gaps
- Reference tokens in component styles

### ❌ DON'T

- Hardcode colors: `#555770` ❌ → `colors.textBase` ✅
- Hardcode spacing: `16px` ❌ → `spacing.s` ✅
- Mix units: Use rem for consistency
- Override n8n tokens directly
- Create component-specific tokens (use component tokens)

## Adding New Tokens

When adding new tokens:

1. **Add to `tokens.ts`** in the appropriate category
2. **Map to n8n token** if available: `var(--n8n-token, fallback)`
3. **Provide fallback** that matches n8n's default
4. **Document** in this file with usage examples
5. **Update component tokens** if it's a common pattern

Example:

```typescript
// In tokens.ts
export const colors = {
  // ... existing tokens
  highlight: 'var(--color-highlight, #ffc107)', // NEW
} as const

// In this doc
#### Highlight Colors
```typescript
colors.highlight    // Highlight background (#ffc107)
```
```

## Token Reference

For complete token reference, see `/workspaces/n8n-pro/extension/src/lib/styles/tokens.ts`

## Migration Guide

To migrate existing hardcoded styles:

1. **Find hardcoded values**: Colors, spacing, sizes
2. **Match to tokens**: Find semantic equivalent
3. **Replace values**: Use token references
4. **Test**: Ensure visual consistency
5. **Verify theme**: Check with n8n's light theme

Example migration:

```typescript
// BEFORE
<div style={{
  background: '#f3f4f6',
  padding: '8px 12px',
  borderRadius: '8px',
  color: '#111827',
}}>
  Content
</div>

// AFTER
import { componentTokens } from '../lib/styles/tokens'

<div style={componentTokens.messageBubble.assistant}>
  Content
</div>
```

