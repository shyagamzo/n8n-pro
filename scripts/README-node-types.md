# Fetching n8n Node Types

## Why Update Node Types?

Our hardcoded list may be outdated or incomplete. Fetching from a real n8n instance ensures we have all available node types with correct naming.

## Method 1: Fetch from n8n API (Automated)

```bash
# Get your n8n API key from n8n settings
# Then run:
node scripts/fetch-n8n-node-types.js http://localhost:5678 n8n_api_YOUR_KEY_HERE
```

## Method 2: Extract from n8n UI (Manual)

If the API endpoint isn't available:

1. **Open n8n** in your browser: http://localhost:5678
2. **Open DevTools** (F12 or Right-click > Inspect)
3. **Go to Network tab**
4. **Open the workflow editor** (create new workflow or edit existing)
5. **Look for these requests**:
   - `/rest/node-types`
   - `/types/nodes.json`
   - `/api/v1/node-types`
6. **Click on the request** > Preview/Response tab
7. **Right-click the JSON** > Copy value
8. **Save to** `scripts/node-types.json`
9. **Run the parser**:
   ```bash
   node scripts/parse-manual-node-types.js
   ```

## Method 3: From n8n Source Code (For Reference)

According to the [n8n documentation](https://docs.n8n.io/integrations/builtin/node-types/), node types follow these patterns:

### Core Nodes
- **Format**: `n8n-nodes-base.{nodeName}`
- **Examples**:
  - `n8n-nodes-base.gmail`
  - `n8n-nodes-base.slack`
  - `n8n-nodes-base.httpRequest`

### LangChain Nodes
- **Format**: `@n8n/n8n-nodes-langchain.{nodeName}`
- **Examples**:
  - `@n8n/n8n-nodes-langchain.agent`
  - `@n8n/n8n-nodes-langchain.lmChatOpenAi`

### Trigger Nodes
- **Format**: `n8n-nodes-base.{serviceName}Trigger`
- **Examples**:
  - `n8n-nodes-base.scheduleTrigger`
  - `n8n-nodes-base.webhook`

## What Gets Updated

Running these scripts will update:
- `extension/src/n8n/hardcoded-node-types.ts`

With:
- All available node types
- Correct type names
- Display names and descriptions
- Node properties and defaults

## Verification

After updating, test the validator:

```bash
cd extension
yarn build
# Reload extension in Chrome
# Try creating a workflow with common nodes (Gmail, Slack, HTTP Request)
```

## References

- [n8n GitHub Repository](https://github.com/n8n-io/n8n)
- [n8n Built-in Node Types Documentation](https://docs.n8n.io/integrations/builtin/node-types/)
- [n8n Community Nodes List](https://community.n8n.io/t/master-list-of-every-n8n-node/155146)

