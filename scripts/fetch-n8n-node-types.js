#!/usr/bin/env node
/**
 * Fetch actual node types from a running n8n instance
 *
 * Usage:
 *   node scripts/fetch-n8n-node-types.js http://localhost:5678 YOUR_API_KEY
 */

const fs = require('fs');
const path = require('path');

const [,, baseUrl = 'http://localhost:5678', apiKey] = process.argv;

if (!apiKey) {
  console.error('Usage: node fetch-n8n-node-types.js <base-url> <api-key>');
  console.error('Example: node fetch-n8n-node-types.js http://localhost:5678 n8n_api_xxx');
  process.exit(1);
}

async function fetchNodeTypes() {
  try {
    // Try the node types endpoint (may not be publicly exposed)
    const response = await fetch(`${baseUrl}/rest/node-types`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const nodeTypes = await response.json();
    return nodeTypes;
  } catch (error) {
    console.error('Failed to fetch from /rest/node-types:', error.message);
    console.error('\nNote: n8n may not expose node types via REST API.');
    console.error('Alternative: Check n8n UI Network tab when loading the workflow editor.');
    return null;
  }
}

async function generateTypeScriptFile(nodeTypes) {
  if (!nodeTypes || !Array.isArray(nodeTypes)) {
    console.error('No valid node types received');
    return;
  }

  const typeDefinitions = nodeTypes.map(node => {
    const name = node.name || node.type;
    const displayName = node.displayName || name;
    const description = node.description || `${displayName} node`;
    const version = node.version || 1;

    return `  '${name}': {
    name: '${name}',
    displayName: '${displayName}',
    description: '${description}',
    group: ${JSON.stringify(node.group || ['transform'])},
    version: ${version},
    defaults: { name: '${displayName}' },
    inputs: ${JSON.stringify(node.inputs || ['main'])},
    outputs: ${JSON.stringify(node.outputs || ['main'])},
    properties: []
  }`;
  }).join(',\n\n');

  const fileContent = `/**
 * Node Types from n8n Instance
 *
 * Fetched from: ${baseUrl}
 * Generated: ${new Date().toISOString()}
 */

import type { NodeType, NodeTypesResponse } from './node-types'

export const HARDCODED_NODE_TYPES: NodeTypesResponse = {
${typeDefinitions}
}

export function getHardcodedNodeTypes(): NodeTypesResponse {
  return HARDCODED_NODE_TYPES
}

export function getNodeTypeCount(): number {
  return Object.keys(HARDCODED_NODE_TYPES).length
}
`;

  const outputPath = path.join(__dirname, '../extension/src/n8n/hardcoded-node-types.ts');
  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log(`✅ Generated ${nodeTypes.length} node types`);
  console.log(`📝 Written to: ${outputPath}`);
}

async function main() {
  console.log(`🔍 Fetching node types from ${baseUrl}...`);
  const nodeTypes = await fetchNodeTypes();

  if (nodeTypes) {
    await generateTypeScriptFile(nodeTypes);
  } else {
    console.log('\n📋 Manual fallback instructions:');
    console.log('1. Open n8n in your browser');
    console.log('2. Open DevTools > Network tab');
    console.log('3. Create a new workflow or open workflow editor');
    console.log('4. Look for requests to /rest/node-types or /types/nodes.json');
    console.log('5. Copy the response JSON');
    console.log('6. Save it to scripts/node-types.json');
    console.log('7. Run: node scripts/parse-node-types.js');
  }
}

main().catch(console.error);

