# Planner Connection Format Fix

## Issue Summary

The planner agent was generating workflows with **incorrect connection structure**, causing n8n to fail with "object is not iterable" error.

## Root Cause

The planner prompt (`src/ai/prompts/agents/planner.md`) contained examples showing **single-nested arrays** for connections, but n8n requires **double-nested arrays**.

### Incorrect Format (Before Fix)
```yaml
connections:
  Schedule Trigger:
    main:
      - node: Send Message    # ❌ Single array
        type: main
        index: 0
```

### Correct Format (After Fix)
```yaml
connections:
  Every Day at 9 AM:
    main:
      - - node: Send Message  # ✅ Double-nested array
          type: main
          index: 0
```

## Changes Made

### 1. Updated Planner Prompt (`src/ai/prompts/agents/planner.md`)

**Added critical section** explaining n8n connection format (lines 38-50):
```yaml
**CRITICAL: n8n Connection Format**
- **Keys**: Use node NAMES (not IDs) as connection keys
- **Structure**: `main` must be a **double-nested array**: `main: [[{...}]]`
- **Target**: Use node NAME in the `node` field (not ID)
- **Example**:
  ```yaml
  connections:
    Source Node Name:    # ← Node NAME
      main:              # ← Output type
        - - node: Target Node Name   # ← Double-nested array!
            type: main
            index: 0
  ```
```

**Fixed Example 1** (lines 93-98):
```diff
- connections:
-   Schedule Trigger:
-     main:
-       - node: Send Slack Message
-         type: main
-         index: 0

+ connections:
+   Every Day at 9 AM:
+     main:
+       - - node: Send Message
+           type: main
+           index: 0
```

**Fixed Example 2** (lines 222-232):
```diff
- connections:
-   Webhook Trigger:
-     main:
-       - node: Transform Data
-         type: main
-         index: 0
-   Transform Data:
-     main:
-       - node: Save to Airtable
-         type: main
-         index: 0

+ connections:
+   Webhook Trigger:
+     main:
+       - - node: Transform Data
+           type: main
+           index: 0
+   Transform Data:
+     main:
+       - - node: Save to Airtable
+           type: main
+           index: 0
```

### 2. Updated Loom Examples (`src/loom/examples.ts`)

**Fixed connection structure** (line 132):
```diff
- connections: {
-   schedule: { main: [{ node: 'slack', type: 'main', index: 0 }] }
- }

+ connections: {
+   'Every Day at 9 AM': { main: [[{ node: 'Send Message', type: 'main', index: 0 }]] }
+ }
```

## Why This Matters

### n8n API Contract

According to actual n8n workflows (verified from n8n source code):

```json
{
  "connections": {
    "When fetching a dataset row": {
      "main": [              // ← Outer array (outputs)
        [                    // ← Inner array (connections for output 0)
          {
            "node": "No Operation, do nothing",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### Why Double-Nested?

n8n nodes can have **multiple outputs** (e.g., IF node has true/false outputs):
- **Outer array**: Represents different outputs (output 0, output 1, etc.)
- **Inner array**: Connections from each specific output

```json
{
  "connections": {
    "IF Node": {
      "main": [
        [{ "node": "TruePath", "type": "main", "index": 0 }],   // Output 0 (true)
        [{ "node": "FalsePath", "type": "main", "index": 0 }]   // Output 1 (false)
      ]
    }
  }
}
```

## Validator Alignment

The validator prompt (`src/ai/prompts/agents/validator.md`) already had the **correct** format in its examples (line 255, 308), which confirms this is the right fix.

## Testing Verification

After this fix, the planner should generate workflows that:
1. ✅ Pass validator checks
2. ✅ Successfully create in n8n via API
3. ✅ Don't throw "object is not iterable" errors
4. ✅ Follow n8n's expected connection structure

## Files Modified

1. `/workspaces/n8n-pro/extension/src/ai/prompts/agents/planner.md` (3 changes)
2. `/workspaces/n8n-pro/extension/src/loom/examples.ts` (1 change)

## Next Steps

1. **Manual Test**: Create a workflow using the updated planner
2. **Verify**: Check that n8n accepts the workflow without errors
3. **Document**: Update TESTING-GUIDE.md with connection format verification
4. **Monitor**: Watch for any validator errors related to connections
