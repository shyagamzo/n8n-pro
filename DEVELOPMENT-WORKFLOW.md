# Development Workflow for n8n Extension

## Issue: Assets Not Loading After Changes

When you make code changes, you might see errors like:
```
Denying load of chrome-extension://*/assets/ChatContainer.css
Resources must be listed in the web_accessible_resources manifest key
```

**Root cause**: Chrome extensions cache assets and manifest. After rebuilding, the extension needs to be reloaded.

---

## Solution: Proper Reload Process

### ✅ Correct Workflow

After making code changes:

```bash
# 1. Build the extension
cd extension
yarn build

# 2. Reload the extension in Chrome
# Go to chrome://extensions/
# Find "n8n Pro Extension"
# Click the reload button (🔄)

# 3. Refresh the n8n page
# Press F5 or Ctrl+R
```

**Important**: You MUST reload the extension, not just refresh the page!

---

## Alternative: Use Dev Mode (Recommended)

For faster development with Hot Module Replacement:

```bash
# Terminal 1: Start dev server
cd extension
yarn dev

# Load extension from dist/ folder
# Changes will auto-reload in some cases
```

**Note**: CRXJS dev mode still requires extension reload for:
- Manifest changes
- Background script changes
- Some content script changes

---

## Quick Reference

| What Changed | What to Reload |
|--------------|----------------|
| **UI components** | Refresh page (HMR in dev mode) |
| **Content script** | Reload extension + refresh page |
| **Background script** | Reload extension + refresh page |
| **Manifest config** | Reload extension + refresh page |
| **Orchestrator logic** | Reload extension + refresh page |

---

## Keyboard Shortcuts

### Reload Extension Quickly

1. **Ctrl+Shift+E** or **Cmd+Shift+E** (open extensions)
2. Find your extension
3. Click reload button
4. **Alt+Tab** back to n8n
5. **F5** to refresh page

---

## Troubleshooting

### "Resources must be listed in web_accessible_resources"

**Cause**: Extension not reloaded after build
**Fix**: Reload extension in chrome://extensions/

### "chrome-extension://invalid/"

**Cause**: Extension ID changed or manifest corrupted
**Fix**:
1. Remove extension from Chrome
2. Rebuild: `yarn build`
3. Load unpacked extension from `dist/` folder

### "Uncaught Error: Unable to preload CSS"

**Cause**: Extension not reloaded, old assets cached
**Fix**: Hard reload extension (remove + re-add if necessary)

### Changes Not Appearing

**Cause**: Browser cache or extension cache
**Fix**:
1. Reload extension
2. Hard refresh page (Ctrl+Shift+R)
3. Clear extension storage if needed

---

## Development Scripts

### Build for Production
```bash
yarn build
```

### Development Mode (HMR)
```bash
yarn dev
# Then load extension from dist/ folder
# Some changes will auto-reload
```

### Lint Code
```bash
yarn lint
```

---

## Best Practices

### For Small Changes (UI tweaks)
- Use `yarn dev` mode
- Changes to React components auto-reload
- Just refresh the page

### For Logic Changes (Orchestrator, Background)
- Build: `yarn build`
- **Always reload extension** in Chrome
- Then refresh the page

### For Testing
- Build production version: `yarn build`
- Load from `dist/` folder
- Test in clean environment

---

## Known Issues

### Extension Reload Needed After Every Build

Chrome extensions don't support true HMR for:
- Service workers (background scripts)
- Content scripts (when structure changes)
- Manifest changes

**Workaround**: Use `yarn dev` and reload extension manually when needed.

### CSS Files Show "Denying load" Error

This happens when:
- Extension was rebuilt but not reloaded
- Manifest doesn't include web_accessible_resources (now fixed)

**Fix**: Always reload extension after `yarn build`.

---

## Quick Start Checklist

When starting development:

- [ ] Run `yarn dev` in terminal
- [ ] Open chrome://extensions/
- [ ] Enable Developer Mode
- [ ] Click "Load unpacked"
- [ ] Select the `extension/dist/` folder
- [ ] Note the extension ID
- [ ] Navigate to http://localhost:5678
- [ ] Click assistant button to test

When making changes:

- [ ] Code change in editor
- [ ] If using `yarn dev`: wait for rebuild (auto)
- [ ] If using `yarn build`: run build command
- [ ] Go to chrome://extensions/
- [ ] Click reload button on extension
- [ ] Go back to n8n page
- [ ] Refresh page (F5)
- [ ] Test your changes

---

## Files Modified

- ✅ `manifest.config.ts` - Added `web_accessible_resources`
- ✅ `vite.config.ts` - Added CRXJS content script configuration
- ✅ `reload-extension.sh` - Helper script with instructions

---

## Summary

**The key insight**: Chrome extensions are NOT like regular web apps.

- Regular web apps: Refresh page to see changes
- Chrome extensions: **Reload extension** → then refresh page

Always remember: **Build → Reload Extension → Refresh Page**

