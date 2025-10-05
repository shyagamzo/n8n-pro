# Decision Record: n8n Design System Integration

## Approach
Use n8n's CSS variables directly from their design system for seamless visual integration.

## Reference Documentation
- **White-labelling Guide**: https://docs.n8n.io/embed/white-labelling/
- **Design System Location**: `packages/frontend/@n8n/design-system/src/css/_tokens.scss`
- **Dark Theme**: `packages/frontend/@n8n/design-system/src/css/_tokens.dark.scss`

## Implementation Strategy
1. **Read n8n's computed styles**: Use `getComputedStyle(document.documentElement)` to access CSS variables
2. **Apply to panel root**: Set variables on our panel element for inheritance
3. **Use standard CSS**: Write components using n8n's exact variable names

## Key CSS Variables (from n8n docs)
```scss
@mixin theme {
  --color-primary-h: 6.9;
  --color-primary-s: 100%;
  --color-primary-l: 67.6%;
  // ... many more variables
}
```

## Code Example
```typescript
// In content script
const n8nStyles = getComputedStyle(document.documentElement);
const primaryColor = n8nStyles.getPropertyValue('--color-primary');
const backgroundColor = n8nStyles.getPropertyValue('--color-background');

// Apply to our panel
panel.style.setProperty('--color-primary', primaryColor);
panel.style.setProperty('--color-background', backgroundColor);
```

## Benefits
- **No mapping needed**: Use n8n's exact variable names
- **Automatic theme sync**: Inherits light/dark mode changes
- **Future-proof**: Works with n8n's design system updates
- **Simple**: No complex discovery or heuristics

## Integration Points
- Content script reads computed styles on panel mount
- Panel root element inherits n8n's theme variables
- React components use standard CSS with n8n variable names
- Automatic theme change detection via MutationObserver

## Notes
- n8n uses Vue.js + SCSS for their frontend
- Our React components will use standard CSS with n8n's variables
- No need to bundle n8n's design system - we inherit at runtime