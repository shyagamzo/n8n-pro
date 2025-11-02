/**
 * Loom Protocol - Usage Examples
 */

import { parse, format, validate, schema } from './index'
import type { LoomValue, LoomObject } from './types'

// ============================================
// Example 1: Simple Key-Value Pairs
// ============================================

export function example1_SimpleKeyValue(): void
{
  const loom = `
title: Daily Report
enabled: true
count: 42
priority: high
`

  const result = parse(loom)
  console.log('Parsed:', result.data)
  // { title: "Daily Report", enabled: true, count: 42, priority: "high" }

  const formatted = format(result.data)
  console.log('Formatted:', formatted)
}

// ============================================
// Example 2: Nested Objects
// ============================================

export function example2_NestedObjects(): void
{
  const loom = `
workflow:
  name: Morning Greeting
  active: true
  schedule:
    interval: daily
    time: 09:00
settings:
  retryOnError: true
  timeout: 30
`

  const result = parse(loom)
  console.log('Parsed:', result.data)
  // {
  //   workflow: { name: "Morning Greeting", active: true, schedule: { interval: "daily", time: "09:00" } },
  //   settings: { retryOnError: true, timeout: 30 }
  // }
}

// ============================================
// Example 3: Arrays
// ============================================

export function example3_Arrays(): void
{
  const loom = `
tags: urgent, daily, automated
nodes:
  - id: schedule
    type: n8n-nodes-base.schedule
    active: true
  - id: slack
    type: n8n-nodes-base.slack
    active: true
`

  const result = parse(loom)
  console.log('Parsed:', result.data)
  // {
  //   tags: ["urgent", "daily", "automated"],
  //   nodes: [
  //     { id: "schedule", type: "n8n-nodes-base.schedule", active: true },
  //     { id: "slack", type: "n8n-nodes-base.slack", active: true }
  //   ]
  // }
}

// ============================================
// Example 4: Classifier Agent Response
// ============================================

export function example4_ClassifierResponse(): void
{
  const loom = `
intent: WORKFLOW_CREATE
confidence: 0.95
reasoning: User wants to create a new scheduled workflow with Slack notification
extractedEntities:
  trigger: schedule
  services: slack, email
  actions: send
`

  const result = parse(loom)
  console.log('Classifier Response:', result.data)
}

// ============================================
// Example 5: Workflow Plan
// ============================================

export function example5_WorkflowPlan(): void
{
  const obj: Record<string, unknown> = {
    title: 'Daily Slack Message',
    summary: 'Sends a morning greeting to #general every day at 9 AM',
    credentialsNeeded: [
      { type: 'slackApi', name: 'Slack Account', requiredFor: 'Sending messages' }
    ],
    workflow: {
      name: 'Morning Greeting',
      nodes: [
        {
          id: 'schedule',
          type: 'n8n-nodes-base.schedule',
          name: 'Every Day at 9 AM',
          parameters: { rule: { interval: 'daily', time: '09:00' } }
        },
        {
          id: 'slack',
          type: 'n8n-nodes-base.slack',
          name: 'Send Message',
          parameters: { channel: '#general', text: 'Good morning team!' }
        }
      ],
      connections: {
        'Every Day at 9 AM': { main: [[{ node: 'Send Message', type: 'main', index: 0 }]] }
      }
    }
  }

  const loom = format(obj as LoomValue)
  console.log('Workflow Plan in Loom:\n', loom)
}

// ============================================
// Example 6: Schema Validation
// ============================================

export function example6_Validation(): void
{
  // Define schema
  const classifierSchema = schema()
    .field('intent', 'string').required().enum(['WORKFLOW_CREATE', 'WORKFLOW_UPDATE', 'QUESTION'])
    .field('confidence', 'number').required()
    .field('reasoning', 'string')
    .build()

  // Valid data
  const validData = {
    intent: 'WORKFLOW_CREATE',
    confidence: 0.95,
    reasoning: 'User wants to create workflow'
  }

  const result1 = validate(validData, classifierSchema)
  console.log('Valid:', result1.valid) // true

  // Invalid data
  const invalidData = {
    intent: 'INVALID_INTENT',
    // missing required confidence
  }

  const result2 = validate(invalidData as LoomObject, classifierSchema)
  console.log('Invalid:', result2.valid) // false
  console.log('Errors:', result2.errors)
}

// ============================================
// Example 7: Round-trip Conversion
// ============================================

export function example7_RoundTrip(): void
{
  const original = {
    title: 'Test Workflow',
    enabled: true,
    count: 42,
    tags: ['urgent', 'daily'],
    config: {
      retryOnError: true,
      timeout: 30
    }
  }

  // Object -> Loom
  const loom = format(original)
  console.log('Loom:\n', loom)

  // Loom -> Object
  const parsed = parse(loom).data
  console.log('Parsed:', parsed)

  // Should be equal (deep comparison)
  console.log('Equal:', JSON.stringify(original) === JSON.stringify(parsed))
}

// ============================================
// Token Comparison: JSON vs Loom
// ============================================

export function exampleTokenComparison(): void
{
  const data = {
    intent: 'WORKFLOW_CREATE',
    confidence: 0.95,
    reasoning: 'User wants to create a scheduled workflow',
    extractedEntities: {
      trigger: 'schedule',
      services: ['slack', 'email'],
      actions: ['send']
    }
  }

  const json = JSON.stringify(data)
  const loom = format(data)

  console.log('JSON length:', json.length, 'chars')
  console.log('Loom length:', loom.length, 'chars')
  console.log('Reduction:', Math.round((1 - loom.length / json.length) * 100), '%')

  console.log('\nJSON:\n', json)
  console.log('\nLoom:\n', loom)
}

