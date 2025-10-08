# Workflow Creation Debugging Guide

## Overview

Comprehensive debugging has been added to help troubleshoot workflow creation issues. You now have visibility into every stage of the workflow creation process.

## 🎯 What You Get

### 1. **Workflow Validation** (Pre-API Call)
- **Location**: `/extension/src/lib/validation/workflow.ts`
- **Purpose**: Catches structural issues before sending to n8n API
- **Uses**: Loom schema validator (existing validation library)

**Validates:**
- ✅ Required fields (name, nodes array)
- ✅ Node structure (name, type, parameters)
- ✅ Node type format (should be `n8n-nodes-base.nodeName`)
- ✅ Position arrays
- ✅ Connections object structure
- ⚠️ Warnings for missing optional fields

**Where to see it:**
- Browser console shows validation results before API call
- Chat UI shows validation errors if workflow is invalid

### 2. **Structured Debug Logging**
- **Location**: `/extension/src/lib/utils/debug.ts`
- **Purpose**: Organized, color-coded console logs with automatic secret sanitization

**Features:**
- Colored, grouped console output
- Automatic API key masking
- Session tracking with timing
- Context-rich error logs

**Log Types:**
```typescript
debugWorkflowCreation(workflow)    // Before sending to n8n
debugWorkflowCreated(id, url)      // On success
debugWorkflowError(error, workflow) // On failure
debugLLMResponse(response)          // LLM raw output
debugLoomParsing(text, parsed)      // Loom parsing results
debugPlanGenerated(plan)            // Final plan with validation
debugValidation(workflow, valid)    // Validation details
```

### 3. **Enhanced Orchestrator Logging**
- **Location**: `/extension/src/lib/orchestrator/index.ts`
- **Purpose**: Track plan generation from LLM to final plan

**Logs:**
- 📝 Prompt construction
- 🤖 LLM response (with preview)
- 🔍 Loom parsing (success/failure)
- ✅ Workflow validation results
- ⚠️ Validation warnings

**Session Tracking:**
```
[Session] Orchestrator-plan-1234567890
  +0ms    Starting plan generation
  +50ms   Built planner prompt
  +100ms  Calling LLM for plan generation
  +2000ms LLM response received
  +2010ms Stripped code fences
  +2020ms Parsing Loom response
  +2050ms Loom parsing succeeded
  +2060ms Validating workflow structure
  +2070ms Workflow validation passed
  +2080ms Session ended: SUCCESS (2080ms)
```

### 4. **Enhanced Error Reporting in Background**
- **Location**: `/extension/src/background/index.ts`
- **Purpose**: Show detailed n8n API errors in chat

**Shows:**
- HTTP status codes
- Full error messages from n8n API
- Validation errors from n8n
- Troubleshooting steps

**Example Error Message:**
```
❌ Failed to create workflow

HTTP Status: 400
Error: Bad Request

Details: Node "Send Message" is missing required parameter "channel"

Validation errors:
- nodes[1].parameters.channel: Required parameter is missing

Troubleshooting:
1. Check browser console for full workflow structure
2. Verify node types and parameters are correct
3. Ensure all required node parameters are provided
4. Check n8n server logs for additional details
```

### 5. **Debug Panel UI Component**
- **Location**: `/extension/src/panel/components/DebugPanel.tsx`
- **Purpose**: Interactive UI to inspect plan and workflow data

**Features:**
- 3 tabs: Plan, Workflow JSON, Validation
- Copy to clipboard buttons
- Collapsible panel (starts collapsed)
- Syntax-highlighted JSON
- Node list with types and IDs

**How to Use:**
1. After LLM generates a plan, click "🐛 Show Debug Info"
2. Switch between tabs:
   - **Plan**: Full plan object (title, summary, credentials, workflow)
   - **Workflow JSON**: Exact JSON sent to n8n API (copy to test manually)
   - **Validation**: Summary with node count, credential info, node list
3. Copy data to clipboard for external testing
4. Close panel when done

## 🔍 Debugging Workflow

### Step 1: Generate a Workflow Plan
```
User: "Create a workflow that sends a Slack message daily at 9am"
→ LLM generates plan
→ Check console for [Orchestrator] logs
```

### Step 2: Check Console Logs
Open browser DevTools console and look for:

```
[Orchestrator] plan
  Data: { messageCount: 2 }

[Orchestrator] LLM response received
  Data: { responseLength: 1234, responsePreview: "title: Daily..." }

[Orchestrator] Loom parsing succeeded

[Orchestrator] Plan generated
  Data: { plan: {...}, validation: {...} }
```

### Step 3: Review Validation
If warnings appear:
```
⚠️ Workflow validation warnings:
  - workflow.nodes[0].id: Node at index 0 missing id (n8n may auto-generate)
  - workflow.nodes[1].parameters: Node "Send Message" missing parameters
```

### Step 4: Click Create Button
Watch console for:
```
📤 Creating workflow in n8n:
  { workflowName: "Daily Slack Message", nodeCount: 2, baseUrl: "http://localhost:5678" }

[WorkflowCreation] Attempting to create workflow
  Data: { workflow: {...}, timestamp: "2024-..." }

✅ Workflow created successfully:
  { workflowId: "abc123", workflowName: "Daily Slack Message" }
```

### Step 5: If Creation Fails
Console shows detailed error:
```
❌ Workflow creation failed:
  error: "Request failed 400 Bad Request: ..."
  status: 400
  body: { message: "...", errors: [...] }
  workflow: {...}
```

Chat UI shows user-friendly error with troubleshooting steps.

### Step 6: Use Debug Panel
1. Click "🐛 Show Debug Info" at bottom of plan
2. Check "Workflow JSON" tab
3. Copy JSON
4. Test manually with curl or Postman:
```bash
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your-key" \
  -H "Content-Type: application/json" \
  -d @workflow.json
```

## 🎯 How the Flow Works Now

### Enrichment Phase (Gathering Requirements)
```
User: "I want to automate Slack"
    ↓
Readiness Check: NOT_READY (missing trigger, action details)
    ↓
Assistant: "What would you like to do with Slack?
            - Send messages to a channel
            - Receive messages
            - Monitor mentions"
    ↓
NO PLAN GENERATED (only conversational response)
```

### Planning Phase (Has Enough Info)
```
User: "Send a message to #general every day at 9am saying 'Good morning'"
    ↓
Readiness Check: READY (has trigger, action, service, details)
    ↓
Assistant: "I'll create a workflow that..."
    ↓
PLAN GENERATED + "Create Workflow" button appears
```

**Key Behavior:**
- Plans only appear when you have enough information
- Assistant can ask questions without showing plans
- Once ready, plan appears with the conversational response

## 🔧 Common Issues and Solutions

### Issue: Validation Fails Before API Call
**Symptoms:**
- Error in chat: "Workflow validation failed"
- Console shows validation errors

**Solution:**
1. Open debug panel → Validation tab
2. Check which fields are missing
3. Review LLM response in console
4. Check if Loom parsing succeeded
5. Look for node structure issues

### Issue: n8n API Returns 400 Error
**Symptoms:**
- Error in chat: "Failed to create workflow"
- Status code 400 in console

**Solution:**
1. Check console for full error body
2. Look for n8n validation errors
3. Verify node types are correct format
4. Check required parameters are present
5. Copy workflow JSON and test manually

### Issue: LLM Response Cannot Be Parsed
**Symptoms:**
- Error in chat: "Failed to generate a valid workflow plan"
- Console shows Loom parsing errors
- No workflow created

**Solution:**
1. Check console for raw LLM response
2. Look for Loom parsing error details
3. Try rephrasing your request more clearly
4. Provide more specific details about what you want
5. Check if request is too complex - break into simpler steps

### Issue: Workflow Created But Broken
**Symptoms:**
- Workflow created successfully
- Opens in n8n but doesn't work
- Nodes have errors

**Solution:**
1. Check console for validation warnings
2. Open debug panel → Validation tab
3. Look for:
   - Missing parameters
   - Invalid node types
   - Incorrect connections
4. Check n8n UI for specific node errors
5. Review LLM response to see if it missed requirements

### Issue: Credentials Missing
**Symptoms:**
- Workflow created
- Nodes have credential errors

**Solution:**
1. Check "Credentials Needed" section in plan
2. Follow deep links to configure credentials
3. Verify credential type matches node requirements

## 📊 What to Share When Reporting Issues

When you encounter a workflow creation issue, share these from console:

1. **Session logs**: The grouped `[Session]` output
2. **Orchestrator logs**: All `[Orchestrator]` entries
3. **Workflow structure**: From debug panel "Workflow JSON" tab
4. **Error details**: Full error object with status and body
5. **Validation results**: Copy validation section from console

**Example:**
```
Console output showing:
- Session Orchestrator-plan-xxxxx with all timing
- LLM response preview
- Loom parsing result
- Validation warnings/errors
- n8n API error response
```

## 🎓 Understanding the Flow

```
User Request
    ↓
Orchestrator.plan()
    ├─ Build prompt
    ├─ Call LLM (logged: response preview)
    ├─ Parse Loom (logged: success/errors)
    ├─ Convert to Plan
    └─ Validate workflow (logged: errors/warnings)
    ↓
Plan shown in UI with Debug Panel
    ↓
User clicks "Create Workflow"
    ↓
Background Handler
    ├─ Validate structure (logged: validation result)
    ├─ Call n8n API (logged: attempt)
    ├─ Success: log workflow ID + URL
    └─ Failure: log full error + show in UI
```

## 🚀 Next Steps

Now that you have comprehensive debugging:

1. **Try creating a workflow** and watch the console
2. **Open the debug panel** to inspect the generated plan
3. **If it fails**, check console for validation errors or API errors
4. **Copy workflow JSON** to test manually if needed
5. **Share console logs** when reporting issues for faster diagnosis

## 📝 Code Organization

```
extension/src/
├── lib/
│   ├── validation/
│   │   └── workflow.ts          # Workflow validator (uses Loom)
│   ├── utils/
│   │   └── debug.ts              # Debug logging utilities
│   ├── orchestrator/
│   │   └── index.ts              # Enhanced with debug logs
│   └── loom/
│       └── validator.ts          # Schema validation library
├── background/
│   └── index.ts                  # Enhanced error reporting
└── panel/
    └── components/
        ├── DebugPanel.tsx        # New debug UI component
        └── PlanMessage.tsx       # Now includes DebugPanel
```

## 🎉 Summary

You now have complete visibility into workflow creation with:

✅ **Validation** before API calls catch issues early
✅ **Structured logging** with automatic secret sanitization
✅ **Session tracking** to see timing and flow
✅ **Enhanced errors** with n8n API details and troubleshooting
✅ **Debug panel UI** to inspect and copy workflow data
✅ **Full transparency** from LLM response to n8n API call

Happy debugging! 🐛→🐞→✅

