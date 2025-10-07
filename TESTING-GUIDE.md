# n8n Extension - Testing Guide

## Prerequisites

### 1. n8n Instance Running
```bash
# Start n8n locally
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Or if installed via npm:
n8n start
```

**Access:** http://localhost:5678

### 2. Get API Keys

**n8n API Key:**
1. Open n8n → Settings → API
2. Create new API key
3. Copy the key

**OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key

### 3. Build & Load Extension

```bash
cd extension
yarn build
```

**Load in Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/dist` folder

---

## Test Scenarios

### Test 1: Extension Setup

**Steps:**
1. Click extension icon → Options
2. Enter OpenAI API key
3. Enter n8n Base URL: `http://localhost:5678`
4. Enter n8n API key
5. Click Save

**Expected:**
- ✅ Settings saved successfully
- ✅ No console errors

---

### Test 2: Basic Chat Response

**Steps:**
1. Navigate to http://localhost:5678
2. Extension trigger button should appear
3. Click trigger → chat panel opens
4. Type: "Hello, can you help me?"
5. Press Enter

**Expected:**
- ✅ LLM responds with greeting
- ✅ Response shows knowledge of n8n
- ✅ No plan generated (just conversational)

---

### Test 3: Simple Workflow Creation

**Steps:**
1. In chat, type: "Create a workflow that sends me a Slack message every morning at 9 AM"
2. Wait for response

**Expected:**
- ✅ LLM generates a plan preview
- ✅ Plan shows:
  - Title: "Daily Morning Slack Message" or similar
  - Summary describing the workflow
  - Nodes: Schedule trigger + Slack node
  - Credentials needed: slackApi
- ✅ "Apply" and "Cancel" buttons appear
- ✅ Conversational response explains the workflow

**Debug:**
- Open Chrome DevTools → Console
- Check for Loom parsing logs
- Verify plan structure

---

### Test 4: Plan Application

**Prerequisites:** Test 3 completed

**Steps:**
1. Click "Apply" button on plan preview
2. Wait for creation

**Expected:**
- ✅ Message: "Applying plan..."
- ✅ Message: "Created workflow with id: [id]"
- ✅ Plan preview disappears
- ✅ Check n8n UI - new workflow appears

**Verify in n8n:**
1. Go to http://localhost:5678/workflows
2. Find the created workflow
3. Open it
4. Check nodes are configured correctly

---

### Test 5: Workflow with Credentials

**Steps:**
1. In chat, type: "Create a workflow that saves form submissions to Google Sheets"
2. Wait for plan

**Expected:**
- ✅ Plan shows credentials needed:
  - type: googleSheetsOAuth2 (or similar)
  - name: Google Sheets Account
  - requiredFor: "Saving data to sheets"
- ✅ Plan includes webhook + transform + sheets nodes

**Note:** If credentials aren't available in n8n, the plan should still generate but note they're required.

---

### Test 6: Credential Detection

**Setup:**
1. In n8n, create a Slack credential:
   - Go to Credentials → Create New
   - Select "Slack API"
   - Configure and save

**Steps:**
1. In chat, type: "Create a workflow to send Slack notifications"
2. Wait for plan

**Expected:**
- ✅ Planner knows Slack credentials are available
- ✅ Plan includes Slack node configured to use credentials

**Debug:**
- Check browser console for credential fetch logs
- Verify `availableCredentials` passed to planner

---

### Test 7: Complex Workflow

**Steps:**
1. In chat, type: "Create a workflow that:
   - Triggers on a webhook
   - Validates the incoming data
   - If valid, saves to Airtable
   - If invalid, sends error email"
2. Wait for plan

**Expected:**
- ✅ Plan includes:
  - Webhook trigger
  - Code/Set node for validation
  - IF node for conditional logic
  - Two branches (valid/invalid)
  - Airtable and Email nodes
- ✅ Connections properly defined

---

### Test 8: Error Handling - Invalid Input

**Steps:**
1. In chat, type: "Make it faster"
2. Wait for response

**Expected:**
- ✅ LLM asks for clarification
- ✅ No plan generated
- ✅ Response is conversational, not an error

---

### Test 9: Error Handling - Loom Parse Failure

**Trigger:** LLM returns malformed Loom (rare)

**Expected:**
- ✅ Console shows parse error
- ✅ Fallback plan generated
- ✅ User sees basic workflow
- ✅ Message suggests refining request

---

### Test 10: Multi-Turn Conversation

**Steps:**
1. Type: "I want to automate something with Slack"
2. LLM asks: "What would you like to do with Slack?"
3. Type: "Send messages"
4. LLM asks: "When should messages be sent?"
5. Type: "Every morning"
6. Wait for plan

**Expected:**
- ✅ Each response builds on previous context
- ✅ Final plan incorporates all conversation details
- ✅ Plan shows schedule + Slack message

---

## Debugging

### Enable Verbose Logging

**Chrome DevTools Console:**
```javascript
localStorage.debug = 'n8n:*'
```

### Check Background Service Worker

1. Go to `chrome://extensions/`
2. Find extension → "service worker" link
3. Opens DevTools for background script
4. Check logs for:
   - Credential fetch
   - Plan generation
   - Loom parsing
   - API calls

### Common Issues

**Issue:** "OpenAI API key not set"
- **Fix:** Go to Options, enter API key, save

**Issue:** "n8n authorization failed"
- **Fix:** Check Base URL and API key in Options
- **Fix:** Ensure n8n is running

**Issue:** "Failed to parse Loom response"
- **Debug:** Check console for raw LLM response
- **Debug:** Check if LLM used JSON instead of Loom
- **Fix:** May need to refine planner prompt

**Issue:** Plan shows empty nodes array
- **Debug:** Check Loom parsing in console
- **Debug:** Verify LLM response structure
- **Fix:** LLM may need more guidance in prompt

**Issue:** Extension trigger button not appearing
- **Fix:** Refresh n8n page
- **Fix:** Check console for injection errors

---

## Performance Testing

### Response Times

**Target:**
- Plan generation: < 10 seconds
- Workflow creation: < 3 seconds
- Chat response: < 5 seconds

**Measure:**
```javascript
// In console
console.time('plan-generation')
// ... send message ...
// ... wait for plan ...
console.timeEnd('plan-generation')
```

### Token Usage

**Estimate:**
- Simple request: ~1,500-2,000 tokens
- Complex request: ~3,000-4,000 tokens
- With context: +500-1,000 tokens

**Monitor in OpenAI dashboard:**
- https://platform.openai.com/usage

---

## Test Results Template

```markdown
## Test Run: [Date]

### Environment
- n8n version: [version]
- Extension version: [commit hash]
- Browser: Chrome [version]
- LLM: gpt-4o-mini

### Results

| Test | Status | Notes |
|------|--------|-------|
| Extension Setup | ✅/❌ | |
| Basic Chat | ✅/❌ | |
| Simple Workflow | ✅/❌ | |
| Plan Application | ✅/❌ | |
| Workflow with Creds | ✅/❌ | |
| Credential Detection | ✅/❌ | |
| Complex Workflow | ✅/❌ | |
| Error Handling | ✅/❌ | |
| Loom Parse Failure | ✅/❌ | |
| Multi-Turn Conv | ✅/❌ | |

### Issues Found
1. [Description]
2. [Description]

### Performance
- Average plan generation: [X]s
- Average workflow creation: [X]s
- Token usage per request: [X] tokens

### Recommendations
1. [Improvement]
2. [Improvement]
```

---

## Next Steps After Testing

**If tests pass:**
1. Document any found issues
2. Create GitHub issues for bugs
3. Collect feedback on UX
4. Plan improvements for Milestone 1.5

**If tests fail:**
1. Debug with console logs
2. Check API responses
3. Verify prompt formatting
4. Test Loom parser independently
5. Check n8n API connectivity

---

## Advanced Testing

### Test Loom Parser Independently

```typescript
import { parse } from './lib/loom'

const loomText = `
title: Test Workflow
summary: A test workflow
workflow:
  name: Test
  nodes:
    - id: trigger
      type: n8n-nodes-base.manualTrigger
`

const result = parse(loomText)
console.log('Parse result:', result)
```

### Test n8n API Directly

```typescript
import { createN8nClient } from './lib/n8n'

const n8n = createN8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'your-api-key'
})

// Test credentials fetch
const creds = await n8n.listCredentials()
console.log('Credentials:', creds)

// Test workflow list
const workflows = await n8n.getWorkflows()
console.log('Workflows:', workflows)
```

---

## Support

**Issues:** File bug reports with:
- Test scenario that failed
- Console logs (screenshot)
- LLM response (if applicable)
- Expected vs actual behavior

**Questions:** Check documentation:
- `README.md` - Project overview
- `development-milestones.md` - Current progress
- `extension/src/lib/prompts/README.md` - Prompt system
- `extension/src/lib/loom/README.md` - Loom protocol

