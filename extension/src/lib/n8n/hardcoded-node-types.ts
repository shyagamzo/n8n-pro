/**
 * Hardcoded n8n Node Types
 *
 * Since n8n doesn't provide a public node-types API endpoint,
 * we maintain a hardcoded list of common node types based on:
 * - n8n documentation: https://docs.n8n.io/integrations/builtin/node-types/
 * - n8n source code: packages/nodes-base/nodes/
 * - Community knowledge and usage patterns
 */

import type { NodeType, NodeTypesResponse } from './node-types'

/**
 * Hardcoded node types organized by category
 */
export const HARDCODED_NODE_TYPES: NodeTypesResponse = {
  // ==========================================
  // TRIGGER NODES
  // ==========================================
  'n8n-nodes-base.manualTrigger': {
    name: 'n8n-nodes-base.manualTrigger',
    displayName: 'Manual Trigger',
    description: 'Trigger workflow manually',
    group: ['trigger'],
    version: 1,
    defaults: { name: 'When clicking "Test workflow"' },
    inputs: [],
    outputs: ['main'],
    properties: []
  },

  'n8n-nodes-base.scheduleTrigger': {
    name: 'n8n-nodes-base.scheduleTrigger',
    displayName: 'Schedule Trigger',
    description: 'Trigger workflow on a schedule',
    group: ['trigger'],
    version: 1,
    defaults: { name: 'Schedule Trigger' },
    inputs: [],
    outputs: ['main'],
    properties: [
      { name: 'rule', displayName: 'Rule', type: 'json', required: true, default: {} },
      { name: 'cronExpression', displayName: 'Cron Expression', type: 'string', required: false }
    ]
  },

  'n8n-nodes-base.webhook': {
    name: 'n8n-nodes-base.webhook',
    displayName: 'Webhook',
    description: 'Trigger workflow via HTTP webhook',
    group: ['trigger'],
    version: 1,
    defaults: { name: 'Webhook' },
    inputs: [],
    outputs: ['main'],
    properties: [
      { name: 'path', displayName: 'Path', type: 'string', required: true },
      { name: 'httpMethod', displayName: 'HTTP Method', type: 'options', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      { name: 'responseMode', displayName: 'Response Mode', type: 'options', options: ['onReceived', 'lastNode'] }
    ]
  },

  'n8n-nodes-base.errorTrigger': {
    name: 'n8n-nodes-base.errorTrigger',
    displayName: 'Error Trigger',
    description: 'Trigger when another workflow errors',
    group: ['trigger'],
    version: 1,
    defaults: { name: 'Error Trigger' },
    inputs: [],
    outputs: ['main'],
    properties: []
  },

  // ==========================================
  // CORE NODES
  // ==========================================
  'n8n-nodes-base.httpRequest': {
    name: 'n8n-nodes-base.httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP API calls',
    group: ['core'],
    version: 3,
    defaults: { name: 'HTTP Request' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'url', displayName: 'URL', type: 'string', required: true },
      { name: 'method', displayName: 'Method', type: 'options', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      { name: 'authentication', displayName: 'Authentication', type: 'options' },
      { name: 'sendHeaders', displayName: 'Send Headers', type: 'boolean' },
      { name: 'sendBody', displayName: 'Send Body', type: 'boolean' }
    ]
  },

  'n8n-nodes-base.code': {
    name: 'n8n-nodes-base.code',
    displayName: 'Code',
    description: 'Execute custom JavaScript or Python code',
    group: ['core'],
    version: 2,
    defaults: { name: 'Code' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'language', displayName: 'Language', type: 'options', options: ['javascript', 'python'] },
      { name: 'jsCode', displayName: 'JavaScript Code', type: 'string' },
      { name: 'pythonCode', displayName: 'Python Code', type: 'string' }
    ]
  },

  'n8n-nodes-base.set': {
    name: 'n8n-nodes-base.set',
    displayName: 'Set',
    description: 'Set data fields',
    group: ['core'],
    version: 2,
    defaults: { name: 'Set' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'mode', displayName: 'Mode', type: 'options', options: ['manual', 'expression'] },
      { name: 'fields', displayName: 'Fields', type: 'fixedCollection' }
    ]
  },

  'n8n-nodes-base.merge': {
    name: 'n8n-nodes-base.merge',
    displayName: 'Merge',
    description: 'Merge data from multiple branches',
    group: ['core'],
    version: 2,
    defaults: { name: 'Merge' },
    inputs: ['main', 'main'],
    outputs: ['main'],
    properties: [
      { name: 'mode', displayName: 'Mode', type: 'options', options: ['append', 'combine', 'merge'] }
    ]
  },

  'n8n-nodes-base.splitInBatches': {
    name: 'n8n-nodes-base.splitInBatches',
    displayName: 'Split In Batches',
    description: 'Process large datasets in batches',
    group: ['core'],
    version: 1,
    defaults: { name: 'Split In Batches' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'batchSize', displayName: 'Batch Size', type: 'number', default: 10 }
    ]
  },

  // ==========================================
  // LOGIC NODES
  // ==========================================
  'n8n-nodes-base.if': {
    name: 'n8n-nodes-base.if',
    displayName: 'IF',
    description: 'Conditional branching',
    group: ['logic'],
    version: 1,
    defaults: { name: 'IF' },
    inputs: ['main'],
    outputs: ['main', 'main'],
    properties: [
      { name: 'conditions', displayName: 'Conditions', type: 'fixedCollection' }
    ]
  },

  'n8n-nodes-base.switch': {
    name: 'n8n-nodes-base.switch',
    displayName: 'Switch',
    description: 'Multiple conditional branches',
    group: ['logic'],
    version: 1,
    defaults: { name: 'Switch' },
    inputs: ['main'],
    outputs: ['main', 'main', 'main', 'main'],
    properties: [
      { name: 'mode', displayName: 'Mode', type: 'options', options: ['expression', 'rules'] },
      { name: 'rules', displayName: 'Rules', type: 'fixedCollection' }
    ]
  },

  'n8n-nodes-base.filter': {
    name: 'n8n-nodes-base.filter',
    displayName: 'Filter',
    description: 'Filter items based on conditions',
    group: ['logic'],
    version: 1,
    defaults: { name: 'Filter' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'conditions', displayName: 'Conditions', type: 'fixedCollection' }
    ]
  },

  'n8n-nodes-base.stopAndError': {
    name: 'n8n-nodes-base.stopAndError',
    displayName: 'Stop And Error',
    description: 'Stop workflow with custom error',
    group: ['logic'],
    version: 1,
    defaults: { name: 'Stop And Error' },
    inputs: ['main'],
    outputs: [],
    properties: [
      { name: 'errorMessage', displayName: 'Error Message', type: 'string' }
    ]
  },

  // ==========================================
  // DATA TRANSFORMATION NODES
  // ==========================================
  'n8n-nodes-base.aggregate': {
    name: 'n8n-nodes-base.aggregate',
    displayName: 'Aggregate',
    description: 'Aggregate data (sum, count, etc.)',
    group: ['transform'],
    version: 1,
    defaults: { name: 'Aggregate' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'operation', displayName: 'Operation', type: 'options', options: ['aggregate', 'group', 'split'] }
    ]
  },

  'n8n-nodes-base.sort': {
    name: 'n8n-nodes-base.sort',
    displayName: 'Sort',
    description: 'Sort items',
    group: ['transform'],
    version: 1,
    defaults: { name: 'Sort' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'sortFieldsUi', displayName: 'Sort Fields', type: 'fixedCollection' }
    ]
  },

  'n8n-nodes-base.limit': {
    name: 'n8n-nodes-base.limit',
    displayName: 'Limit',
    description: 'Limit number of items',
    group: ['transform'],
    version: 1,
    defaults: { name: 'Limit' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'maxItems', displayName: 'Max Items', type: 'number', default: 1 }
    ]
  },

  // ==========================================
  // SERVICE INTEGRATION NODES
  // ==========================================
  'n8n-nodes-base.slack': {
    name: 'n8n-nodes-base.slack',
    displayName: 'Slack',
    description: 'Slack integration',
    group: ['communication'],
    version: 1,
    defaults: { name: 'Slack' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['message', 'channel', 'user'] },
      { name: 'operation', displayName: 'Operation', type: 'options' }
    ]
  },

  'n8n-nodes-base.gmail': {
    name: 'n8n-nodes-base.gmail',
    displayName: 'Gmail',
    description: 'Gmail integration',
    group: ['communication'],
    version: 2,
    defaults: { name: 'Gmail' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['message', 'draft', 'label'] },
      { name: 'operation', displayName: 'Operation', type: 'options' }
    ]
  },

  'n8n-nodes-base.googleSheets': {
    name: 'n8n-nodes-base.googleSheets',
    displayName: 'Google Sheets',
    description: 'Google Sheets integration',
    group: ['productivity'],
    version: 3,
    defaults: { name: 'Google Sheets' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'operation', displayName: 'Operation', type: 'options', options: ['append', 'read', 'update', 'delete'] }
    ]
  },

  'n8n-nodes-base.airtable': {
    name: 'n8n-nodes-base.airtable',
    displayName: 'Airtable',
    description: 'Airtable database operations',
    group: ['productivity'],
    version: 1,
    defaults: { name: 'Airtable' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'operation', displayName: 'Operation', type: 'options', options: ['create', 'update', 'delete', 'get', 'list'] }
    ]
  },

  'n8n-nodes-base.notion': {
    name: 'n8n-nodes-base.notion',
    displayName: 'Notion',
    description: 'Notion workspace integration',
    group: ['productivity'],
    version: 2,
    defaults: { name: 'Notion' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['database', 'page', 'block'] },
      { name: 'operation', displayName: 'Operation', type: 'options' }
    ]
  },

  'n8n-nodes-base.discord': {
    name: 'n8n-nodes-base.discord',
    displayName: 'Discord',
    description: 'Discord bot integration',
    group: ['communication'],
    version: 1,
    defaults: { name: 'Discord' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['message', 'channel', 'member'] },
      { name: 'operation', displayName: 'Operation', type: 'options' }
    ]
  },

  // ==========================================
  // AI / LANGCHAIN NODES
  // ==========================================
  '@n8n/n8n-nodes-langchain.agent': {
    name: '@n8n/n8n-nodes-langchain.agent',
    displayName: 'AI Agent',
    description: 'Create AI agents with LangChain',
    group: ['ai'],
    version: 1,
    defaults: { name: 'AI Agent' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'agent', displayName: 'Agent Type', type: 'options' },
      { name: 'promptType', displayName: 'Prompt Type', type: 'options' },
      { name: 'text', displayName: 'System Message', type: 'string' }
    ]
  },

  '@n8n/n8n-nodes-langchain.lmChatOpenAi': {
    name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
    displayName: 'OpenAI Chat Model',
    description: 'Direct OpenAI chat completions',
    group: ['ai'],
    version: 1,
    defaults: { name: 'OpenAI Chat Model' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'model', displayName: 'Model', type: 'options', options: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
      { name: 'prompt', displayName: 'Prompt', type: 'string' }
    ]
  },

  '@n8n/n8n-nodes-langchain.chainLlm': {
    name: '@n8n/n8n-nodes-langchain.chainLlm',
    displayName: 'Basic LLM Chain',
    description: 'Simple LLM chain without agent complexity',
    group: ['ai'],
    version: 1,
    defaults: { name: 'Basic LLM Chain' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'model', displayName: 'Model', type: 'string' },
      { name: 'prompt', displayName: 'Prompt', type: 'string' }
    ]
  },

  // ==========================================
  // OTHER POPULAR NODES
  // ==========================================
  'n8n-nodes-base.wait': {
    name: 'n8n-nodes-base.wait',
    displayName: 'Wait',
    description: 'Wait for a specified duration',
    group: ['logic'],
    version: 1,
    defaults: { name: 'Wait' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'resume', displayName: 'Resume', type: 'options', options: ['after', 'webhook'] },
      { name: 'amount', displayName: 'Amount', type: 'number' },
      { name: 'unit', displayName: 'Unit', type: 'options', options: ['seconds', 'minutes', 'hours', 'days'] }
    ]
  },

  'n8n-nodes-base.readBinaryFile': {
    name: 'n8n-nodes-base.readBinaryFile',
    displayName: 'Read Binary File',
    description: 'Read file from disk',
    group: ['input'],
    version: 1,
    defaults: { name: 'Read Binary File' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'filePath', displayName: 'File Path', type: 'string', required: true }
    ]
  },

  'n8n-nodes-base.writeBinaryFile': {
    name: 'n8n-nodes-base.writeBinaryFile',
    displayName: 'Write Binary File',
    description: 'Write file to disk',
    group: ['output'],
    version: 1,
    defaults: { name: 'Write Binary File' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'fileName', displayName: 'File Name', type: 'string', required: true }
    ]
  },

  'n8n-nodes-base.readBinaryFiles': {
    name: 'n8n-nodes-base.readBinaryFiles',
    displayName: 'Read Binary Files',
    description: 'Read multiple files from disk',
    group: ['input'],
    version: 1,
    defaults: { name: 'Read Binary Files' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'fileSelector', displayName: 'File Selector', type: 'string', required: true }
    ]
  }
}

/**
 * Get all hardcoded node types
 */
export function getHardcodedNodeTypes(): NodeTypesResponse {
  return HARDCODED_NODE_TYPES
}

/**
 * Get node type count
 */
export function getNodeTypeCount(): number {
  return Object.keys(HARDCODED_NODE_TYPES).length
}

/**
 * Get node types by group
 */
export function getNodeTypesByGroup(group: string): NodeType[] {
  return Object.values(HARDCODED_NODE_TYPES).filter(nt => nt.group?.includes(group))
}

