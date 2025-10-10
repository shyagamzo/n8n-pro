# ⚠️ CRITICAL: Reload Extension After Every Build

## The Issue You're Experiencing

If you're seeing:
- ✗ Token duplication
- ✗ "Called interrupt() outside the context of a graph" error
- ✗ CSS loading errors

**Most likely cause**: You rebuilt the code but **didn't reload the extension** in Chrome.

---

## ✅ Proper Testing Process

### After Every Code Change:

```bash
# 1. Build
cd extension
yarn build

# 2. RELOAD EXTENSION (Critical!)
#    → Open chrome://extensions/
#    → Find "n8n Pro Extension"
#    → Click the RELOAD button (🔄 circular arrow icon)
#    → NOT the same as refreshing the page!

# 3. Refresh n8n page
#    → Go to localhost:5678
#    → Press F5 or Ctrl+R

# 4. Test
#    → Click assistant button
#    → Check console for errors
```

---

## How to Know if Extension is Reloaded

**Check the Service Worker**:
1. Go to `chrome://extensions/`
2. Find "n8n Pro Extension"
3. Click "service worker" link
4. Check console timestamp - should be recent
5. Look for: "n8n Pro Extension installed" log

**Check the Content Script**:
1. Open n8n page (localhost:5678)
2. Open DevTools (F12)
3. Check Console tab
4. Look for extension logs with recent timestamps

---

## Common Mistakes

### ❌ Only Refreshing the Page
- This loads the old extension code
- Changes won't appear

### ❌ Rebuilding Without Reloading
- New code is built but Chrome uses cached version
- Extension must be reloaded in chrome://extensions/

### ❌ Reloading Page Instead of Extension
- F5 refreshes the page, not the extension
- Must click reload button in chrome://extensions/

---

## Current Status

After the latest build, you should have:
- ✅ AsyncLocalStorage polyfill initialized
- ✅ web_accessible_resources in manifest
- ✅ Token duplication fix
- ✅ GraphInterrupt handling

**But only if you reloaded the extension!**

---

## Quick Test

After reloading extension:

```
1. Click assistant button
2. Type: "help me with email"
3. Check console - should see:
   ✅ "New chat connection"
   ✅ "Handling chat message"
   ✅ No "outside the context" error
   ✅ Tokens appear once (not duplicated)
```

---

**DID YOU RELOAD THE EXTENSION?** If not, that's why the fixes aren't working! 🔄

