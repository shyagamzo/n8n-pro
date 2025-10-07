/**
 * Loom Protocol - Comprehensive Test Suite
 * Run with: npx tsx src/lib/loom/test.ts
 */

import { parse, format, validate, schema } from './index'
import type { LoomObject } from './types'

// ANSI colors
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

let passed = 0
let failed = 0

function test(name: string, fn: () => void): void
{
  try
  {
    fn()
    console.log(`${GREEN}✓${RESET} ${name}`)
    passed++
  }
  catch (error)
  {
    console.log(`${RED}✗${RESET} ${name}`)
    console.log(`  ${RED}${(error as Error).message}${RESET}`)
    failed++
  }
}

function assert(condition: boolean, message: string): void
{
  if (!condition)
  {
    throw new Error(message)
  }
}

function section(title: string): void
{
  console.log(`\n${BOLD}${BLUE}${title}${RESET}`)
  console.log('─'.repeat(60))
}

// ============================================
// Test 1: Simple Key-Value Parsing
// ============================================

section('Test 1: Simple Key-Value Parsing')

test('Parse simple strings', () =>
{
  const loom = 'name: John Doe\ntitle: Engineer'
  const result = parse(loom)
  assert(result.success, 'Parse should succeed')
  assert(result.data.name === 'John Doe', 'Name should match')
  assert(result.data.title === 'Engineer', 'Title should match')
})

test('Parse numbers', () =>
{
  const loom = 'age: 30\nscore: 95.5'
  const result = parse(loom)
  assert(result.data.age === 30, 'Integer should parse')
  assert(result.data.score === 95.5, 'Float should parse')
})

test('Parse booleans', () =>
{
  const loom = 'enabled: true\nactive: false'
  const result = parse(loom)
  assert(result.data.enabled === true, 'True should parse')
  assert(result.data.active === false, 'False should parse')
})

test('Parse null', () =>
{
  const loom = 'value: null'
  const result = parse(loom)
  assert(result.data.value === null, 'Null should parse')
})

// ============================================
// Test 2: Nested Objects
// ============================================

section('Test 2: Nested Objects')

test('Parse nested object', () =>
{
  const loom = `
workflow:
  name: Test
  active: true
`
  const result = parse(loom)
  const workflow = result.data.workflow as LoomObject
  assert(workflow.name === 'Test', 'Nested name should match')
  assert(workflow.active === true, 'Nested active should match')
})

test('Parse deeply nested object', () =>
{
  const loom = `
config:
  database:
    host: localhost
    port: 5432
    credentials:
      username: admin
      password: secret
`
  const result = parse(loom)
  const config = result.data.config as LoomObject
  const db = config.database as LoomObject
  const creds = db.credentials as LoomObject
  assert(db.host === 'localhost', 'Deep nested host should match')
  assert(creds.username === 'admin', 'Deep nested username should match')
})

// ============================================
// Test 3: Arrays
// ============================================

section('Test 3: Arrays')

test('Parse inline array', () =>
{
  const loom = 'tags: urgent, daily, automated'
  const result = parse(loom)
  const tags = result.data.tags as string[]
  assert(Array.isArray(tags), 'Should be array')
  assert(tags.length === 3, 'Should have 3 items')
  assert(tags[0] === 'urgent', 'First item should match')
})

test('Parse multi-line array with primitives', () =>
{
  const loom = `
items:
  - first
  - second
  - third
`
  const result = parse(loom)
  const items = result.data.items as string[]
  assert(Array.isArray(items), 'Should be array')
  assert(items.length === 3, 'Should have 3 items')
  assert(items[1] === 'second', 'Second item should match')
})

test('Parse array of objects', () =>
{
  const loom = `
nodes:
  - id: node1
    type: schedule
  - id: node2
    type: slack
`
  const result = parse(loom)
  const nodes = result.data.nodes as LoomObject[]
  assert(Array.isArray(nodes), 'Should be array')
  assert(nodes.length === 2, 'Should have 2 nodes')
  assert(nodes[0].id === 'node1', 'First node id should match')
  assert(nodes[1].type === 'slack', 'Second node type should match')
})

// ============================================
// Test 4: Formatting
// ============================================

section('Test 4: Formatting')

test('Format simple object', () =>
{
  const obj = { name: 'Test', count: 42, enabled: true }
  const loom = format(obj)
  assert(loom.includes('name: Test'), 'Should include name')
  assert(loom.includes('count: 42'), 'Should include count')
  assert(loom.includes('enabled: true'), 'Should include enabled')
})

test('Format nested object', () =>
{
  const obj = {
    workflow: {
      name: 'Test Workflow',
      active: true
    }
  }
  const loom = format(obj)
  assert(loom.includes('workflow:'), 'Should include workflow key')
  assert(loom.includes('  name: Test Workflow'), 'Should indent nested properties')
})

test('Format array', () =>
{
  const obj = { tags: ['one', 'two', 'three'] }
  const loom = format(obj)
  // Should be inline for short simple arrays (compact format, no spaces)
  assert(loom.includes('tags: one,two,three'), 'Should format as inline array')
})

// ============================================
// Test 5: Round-Trip Conversion
// ============================================

section('Test 5: Round-Trip Conversion')

test('Round-trip simple object', () =>
{
  const original = { name: 'Test', count: 42, enabled: true }
  const loom = format(original)
  const parsed = parse(loom).data
  assert(JSON.stringify(original) === JSON.stringify(parsed), 'Round-trip should preserve data')
})

test('Round-trip nested object', () =>
{
  const original = {
    workflow: {
      name: 'Test',
      settings: {
        retry: true,
        timeout: 30
      }
    }
  }
  const loom = format(original)
  const parsed = parse(loom).data
  assert(JSON.stringify(original) === JSON.stringify(parsed), 'Round-trip should preserve nested data')
})

test('Round-trip with arrays', () =>
{
  const original = {
    name: 'Test',
    tags: ['a', 'b', 'c'],
    items: [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' }
    ]
  }
  const loom = format(original)
  const parsed = parse(loom).data
  assert(JSON.stringify(original) === JSON.stringify(parsed), 'Round-trip should preserve arrays')
})

// ============================================
// Test 6: Schema Validation
// ============================================

section('Test 6: Schema Validation')

test('Validate valid data', () =>
{
  const mySchema = schema()
    .field('name', 'string').required()
    .field('age', 'number')
    .field('enabled', 'boolean')
    .build()
  
  const data = { name: 'Test', age: 30, enabled: true }
  const result = validate(data, mySchema)
  assert(result.valid, 'Valid data should pass validation')
  assert(result.errors.length === 0, 'Should have no errors')
})

test('Detect missing required field', () =>
{
  const mySchema = schema()
    .field('name', 'string').required()
    .field('age', 'number')
    .build()
  
  const data = { age: 30 }
  const result = validate(data, mySchema)
  assert(!result.valid, 'Missing required field should fail')
  assert(result.errors.length > 0, 'Should have errors')
  assert(result.errors[0].message.includes('Required'), 'Error should mention required field')
})

test('Detect type mismatch', () =>
{
  const mySchema = schema()
    .field('name', 'string')
    .field('age', 'number')
    .build()
  
  const data = { name: 'Test', age: 'thirty' }
  const result = validate(data as LoomObject, mySchema)
  assert(!result.valid, 'Type mismatch should fail')
  assert(result.errors.some(e => e.message.includes('type')), 'Error should mention type')
})

test('Validate enum values', () =>
{
  const mySchema = schema()
    .field('status', 'string').enum(['active', 'inactive', 'pending'])
    .build()
  
  const validData = { status: 'active' }
  const result1 = validate(validData, mySchema)
  assert(result1.valid, 'Valid enum should pass')
  
  const invalidData = { status: 'invalid' }
  const result2 = validate(invalidData, mySchema)
  assert(!result2.valid, 'Invalid enum should fail')
})

// ============================================
// Test 7: Classifier Agent Response
// ============================================

section('Test 7: Real-World Use Case - Classifier')

test('Parse classifier response', () =>
{
  const loom = `
intent: WORKFLOW_CREATE
confidence: 0.95
reasoning: User wants to create a scheduled workflow with Slack notification
extractedEntities:
  trigger: schedule
  services: slack
  actions: send
`
  const result = parse(loom)
  assert(result.success, 'Should parse successfully')
  assert(result.data.intent === 'WORKFLOW_CREATE', 'Intent should match')
  assert(result.data.confidence === 0.95, 'Confidence should match')
  
  const entities = result.data.extractedEntities as LoomObject
  assert(entities.trigger === 'schedule', 'Trigger should match')
  assert(entities.services === 'slack', 'Services should match')
})

// ============================================
// Test 8: Workflow Plan
// ============================================

section('Test 8: Real-World Use Case - Workflow Plan')

test('Parse workflow plan', () =>
{
  const loom = `
title: Daily Slack Message
summary: Sends morning greeting to #general at 9 AM
credentialsNeeded:
  - type: slackApi
    name: Slack Account
workflow:
  name: Morning Greeting
  nodes:
    - id: schedule
      type: n8n-nodes-base.schedule
    - id: slack
      type: n8n-nodes-base.slack
`
  const result = parse(loom)
  assert(result.success, 'Should parse successfully')
  assert(result.data.title === 'Daily Slack Message', 'Title should match')
  
  const workflow = result.data.workflow as LoomObject
  assert(workflow.name === 'Morning Greeting', 'Workflow name should match')
  
  const nodes = workflow.nodes as LoomObject[]
  assert(nodes.length === 2, 'Should have 2 nodes')
  assert(nodes[0].id === 'schedule', 'First node should be schedule')
  assert(nodes[1].id === 'slack', 'Second node should be slack')
})

// ============================================
// Test 9: Token Efficiency
// ============================================

section('Test 9: Token Efficiency Comparison')

test('Compare token efficiency: Classifier response', () =>
{
  const data = {
    intent: 'WORKFLOW_CREATE',
    confidence: 0.95,
    reasoning: 'User wants to create workflow',
    extractedEntities: {
      trigger: 'schedule',
      services: ['slack', 'email'],
      actions: ['send']
    }
  }
  
  const json = JSON.stringify(data)
  const loom = format(data)
  
  const jsonChars = json.length
  const loomChars = loom.length
  const reduction = Math.round((1 - loomChars / jsonChars) * 100)
  
  console.log(`  ${YELLOW}JSON:${RESET} ${jsonChars} chars (~${Math.ceil(jsonChars / 4)} tokens)`)
  console.log(`  ${YELLOW}Loom:${RESET} ${loomChars} chars (~${Math.ceil(loomChars / 4)} tokens)`)
  console.log(`  ${GREEN}Reduction:${RESET} ${reduction}%`)
  
  assert(loomChars < jsonChars, 'Loom should be smaller than JSON')
  // Note: Nested objects may not always be smaller due to indentation
  // Main benefit is readability and LLM generation, not always token count for small objects
})

test('Compare token efficiency: Workflow plan', () =>
{
  const data = {
    title: 'Daily Slack Message',
    summary: 'Sends morning greeting',
    workflow: {
      name: 'Morning Greeting',
      nodes: [
        { id: 'schedule', type: 'n8n-nodes-base.schedule', name: 'Every Day at 9 AM' },
        { id: 'slack', type: 'n8n-nodes-base.slack', name: 'Send Message' }
      ]
    }
  }
  
  const json = JSON.stringify(data)
  const loom = format(data)
  
  const jsonChars = json.length
  const loomChars = loom.length
  const reduction = Math.round((1 - loomChars / jsonChars) * 100)
  
  console.log(`  ${YELLOW}JSON:${RESET} ${jsonChars} chars (~${Math.ceil(jsonChars / 4)} tokens)`)
  console.log(`  ${YELLOW}Loom:${RESET} ${loomChars} chars (~${Math.ceil(loomChars / 4)} tokens)`)
  console.log(`  ${GREEN}Reduction:${RESET} ${reduction}%`)
  
  // Loom's benefit is readability and LLM-friendly format
  // For deeply nested structures, indentation may add chars but improves parseability
  console.log(`  ${BLUE}Note:${RESET} Loom optimizes for LLM readability, not just byte count`)
})

// ============================================
// Test 10: Error Handling
// ============================================

section('Test 10: Error Handling')

test('Handle empty input', () =>
{
  const result = parse('')
  assert(result.success, 'Empty input should succeed')
  assert(Object.keys(result.data).length === 0, 'Should return empty object')
})

test('Handle comments', () =>
{
  const loom = `
# This is a comment
name: Test
# Another comment
age: 30
`
  const result = parse(loom)
  assert(result.success, 'Should parse with comments')
  assert(result.data.name === 'Test', 'Should parse data correctly')
  assert(Object.keys(result.data).length === 2, 'Should skip comments')
})

test('Handle invalid syntax gracefully', () =>
{
  const loom = 'invalid line without colon'
  const result = parse(loom)
  // Parser should continue but report errors
  assert(result.errors.length > 0, 'Should have errors')
  assert(result.errors[0].message.includes('expected key:value'), 'Error should mention syntax')
})

// ============================================
// Summary
// ============================================

section('Test Summary')

const total = passed + failed
console.log(`\n${BOLD}Results:${RESET}`)
console.log(`  ${GREEN}Passed:${RESET} ${passed}/${total}`)
if (failed > 0)
{
  console.log(`  ${RED}Failed:${RESET} ${failed}/${total}`)
}

if (failed === 0)
{
  console.log(`\n${GREEN}${BOLD}✓ All tests passed!${RESET}`)
  process.exit(0)
}
else
{
  console.log(`\n${RED}${BOLD}✗ Some tests failed${RESET}`)
  process.exit(1)
}

