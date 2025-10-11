/**
 * SystemEvents tests
 * 
 * Basic tests to verify event emission and subscription work correctly.
 * RxJS marble tests can be added later for complex scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { systemEvents } from '../index'
import type { WorkflowEvent, AgentEvent, ErrorEvent } from '../types'
import { Subscription } from 'rxjs'

describe('SystemEvents', () => {
  let subscriptions: Subscription[] = []
  
  afterEach(() => {
    subscriptions.forEach(sub => sub.unsubscribe())
    subscriptions = []
  })

  it('should emit and receive workflow events', (done) => {
    const testWorkflow = { id: 'test-123', name: 'Test Workflow', nodes: [] }
    
    const sub = systemEvents.workflow$.subscribe((event: WorkflowEvent) => {
      expect(event.domain).toBe('workflow')
      expect(event.type).toBe('created')
      expect(event.payload.workflow).toEqual(testWorkflow)
      expect(event.payload.workflowId).toBe('123')
      done()
    })
    subscriptions.push(sub)
    
    systemEvents.emit({
      domain: 'workflow',
      type: 'created',
      payload: { workflow: testWorkflow, workflowId: '123' },
      timestamp: Date.now()
    })
  })

  it('should filter events by domain', (done) => {
    let workflowEventReceived = false
    let agentEventReceived = false
    
    // Subscribe to workflow events only
    const workflowSub = systemEvents.workflow$.subscribe(() => {
      workflowEventReceived = true
    })
    subscriptions.push(workflowSub)
    
    // Subscribe to agent events only
    const agentSub = systemEvents.agent$.subscribe(() => {
      agentEventReceived = true
      
      // Verify filtering worked
      expect(workflowEventReceived).toBe(false)
      expect(agentEventReceived).toBe(true)
      done()
    })
    subscriptions.push(agentSub)
    
    // Emit agent event (not workflow)
    systemEvents.emit({
      domain: 'agent',
      type: 'started',
      payload: { agent: 'planner', action: 'planning' },
      timestamp: Date.now()
    })
  })

  it('should handle error events', (done) => {
    const testError = new Error('Test error')
    
    const sub = systemEvents.error$.subscribe((event: ErrorEvent) => {
      expect(event.domain).toBe('error')
      expect(event.type).toBe('api')
      expect(event.payload.error).toBe(testError)
      expect(event.payload.source).toBe('test-source')
      done()
    })
    subscriptions.push(sub)
    
    systemEvents.emit({
      domain: 'error',
      type: 'api',
      payload: {
        error: testError,
        source: 'test-source',
        userMessage: 'Test error occurred'
      },
      timestamp: Date.now()
    })
  })

  it('should support multiple subscribers to same stream', (done) => {
    let subscriber1Called = false
    let subscriber2Called = false
    
    const sub1 = systemEvents.workflow$.subscribe(() => {
      subscriber1Called = true
    })
    subscriptions.push(sub1)
    
    const sub2 = systemEvents.workflow$.subscribe(() => {
      subscriber2Called = true
      
      // Both should be called
      expect(subscriber1Called).toBe(true)
      expect(subscriber2Called).toBe(true)
      done()
    })
    subscriptions.push(sub2)
    
    systemEvents.emit({
      domain: 'workflow',
      type: 'created',
      payload: { workflow: { name: 'Test' } },
      timestamp: Date.now()
    })
  })

  it('should include sessionId in agent events', (done) => {
    const testSessionId = 'test-session-123'
    
    const sub = systemEvents.agent$.subscribe((event: AgentEvent) => {
      expect(event.payload.sessionId).toBe(testSessionId)
      done()
    })
    subscriptions.push(sub)
    
    systemEvents.emit({
      domain: 'agent',
      type: 'started',
      payload: { 
        agent: 'planner', 
        action: 'planning',
        sessionId: testSessionId
      },
      timestamp: Date.now()
    })
  })
})

