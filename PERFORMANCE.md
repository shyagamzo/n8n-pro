# Performance Guide

> Performance optimization strategies and best practices for the n8n Pro Extension

## Table of Contents

- [Performance Targets](#performance-targets)
- [Bundle Size Optimization](#bundle-size-optimization)
- [Runtime Performance](#runtime-performance)
- [Memory Management](#memory-management)
- [Network Performance](#network-performance)
- [Monitoring & Profiling](#monitoring--profiling)

---

## Performance Targets

### Load Time Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Extension Load | < 2s | TBD | ⏳ |
| Content Script Injection | < 500ms | TBD | ⏳ |
| Panel First Paint | < 1s | TBD | ⏳ |
| Initial Chat Response | < 3s | TBD | ⏳ |

### Runtime Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Memory Usage (Idle) | < 50MB | TBD | ⏳ |
| Memory Usage (Active) | < 100MB | TBD | ⏳ |
| CPU Usage (Idle) | < 1% | TBD | ⏳ |
| API Response Time | < 5s | ✅ | ✅ |

### Bundle Size Targets

| Bundle | Target | Current | Status |
|--------|--------|---------|--------|
| Content Script | < 100KB | TBD | ⏳ |
| Background Worker | < 200KB | TBD | ⏳ |
| Panel UI | < 300KB | TBD | ⏳ |
| Total Extension | < 1MB | TBD | ⏳ |

---

## Bundle Size Optimization

### 1. Code Splitting

**Strategy:** Split code by entry point

```typescript
// ✅ Good: Separate bundles
// content.ts, background.ts, panel.ts, options.ts

// ❌ Bad: One massive bundle
// index.ts that imports everything
```

**Current Implementation:**
- Content script: Minimal injection code
- Background worker: API clients + orchestrator
- Panel: React UI components
- Options: Settings page

### 2. Tree Shaking

**Enable with Vite:**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code
          react: ['react', 'react-dom'],
          langchain: ['@langchain/core', '@langchain/openai'],
        },
      },
    },
  },
})
```

### 3. Dynamic Imports

**Lazy Load Heavy Dependencies:**

```typescript
// ✅ Good: Lazy load
const { marked } = await import('marked')

// ❌ Bad: Import at top level
import { marked } from 'marked'
```

**Candidates for Lazy Loading:**
- Markdown parser (marked)
- DOMPurify
- LangChain modules

### 4. Bundle Analysis

**Analyze Bundle Size:**

```bash
# Install analyzer
yarn add -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

plugins: [
  visualizer({
    open: true,
    gzipSize: true,
    brotliSize: true,
  })
]

# Build and view
yarn build
```

**Identify Large Dependencies:**
1. Check `stats.html` after build
2. Find largest modules
3. Replace or lazy load
4. Repeat until target met

### 5. Dependency Optimization

**Check Bundle Impact Before Adding:**

```bash
# Check package size
npx bundle-phobia [package-name]

# Example: Check marked size
npx bundle-phobia marked
```

**Alternative Lightweight Libraries:**
- `marked` (48KB) → Consider `markdown-it` (28KB)
- `zustand` (1KB) → Already optimal ✅
- `dompurify` (25KB) → No good alternative

---

## Runtime Performance

### 1. React Performance

**Memoization:**

```typescript
// ✅ Good: Memoize expensive components
import { memo } from 'react'

export const MessageBubble = memo(function MessageBubble({ message }) {
  return <div>{message.text}</div>
})

// ✅ Good: Memoize callbacks
const handleSend = useCallback((text: string) => {
  sendMessage(text)
}, [sendMessage])
```

**Avoid Unnecessary Renders:**

```typescript
// ✅ Good: Split state
const messages = useStore(state => state.messages)
const sending = useStore(state => state.sending)

// ❌ Bad: Subscribe to entire store
const store = useStore()
```

### 2. Debouncing & Throttling

**Use Performance Utilities:**

```typescript
import { debounce, throttle } from '../utils/performance'

// Debounce input (wait for pause)
const debouncedSearch = debounce((query: string) => {
  performSearch(query)
}, 300)

// Throttle scroll (limit frequency)
const throttledScroll = throttle(() => {
  handleScroll()
}, 100)
```

**Common Use Cases:**
- Input fields: Debounce 300ms
- Scroll handlers: Throttle 100ms
- Resize handlers: Throttle 200ms
- Search: Debounce 500ms

### 3. Virtual Scrolling (Future)

**For Long Chat Histories:**

```typescript
// Consider react-window or react-virtualized
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  )}
</FixedSizeList>
```

**When to Implement:**
- More than 100 messages
- Noticeable scroll lag
- High memory usage

---

## Memory Management

### 1. Cleanup Patterns

**Use Cleanup Utility:**

```typescript
import { createCleanup } from '../utils/performance'

function setupListeners() {
  const cleanup = createCleanup()
  
  const port = chrome.runtime.connect()
  cleanup.add(() => port.disconnect())
  
  const timer = setInterval(() => {}, 1000)
  cleanup.add(() => clearInterval(timer))
  
  return cleanup.execute
}

// Later
const cleanup = setupListeners()
cleanup() // Clean up all resources
```

**React Effect Cleanup:**

```typescript
useEffect(() => {
  const cleanup = createCleanup()
  
  // Set up resources
  const port = chrome.runtime.connect()
  cleanup.add(() => port.disconnect())
  
  // Return cleanup function
  return () => cleanup.execute()
}, [])
```

### 2. Prevent Memory Leaks

**Common Leak Sources:**

1. **Event Listeners:**
   ```typescript
   // ✅ Good: Remove listener
   port.onMessage.addListener(handler)
   port.onDisconnect.addListener(() => {
     port.onMessage.removeListener(handler)
   })
   
   // ❌ Bad: Never removed
   port.onMessage.addListener(handler)
   ```

2. **Timers:**
   ```typescript
   // ✅ Good: Clear timer
   const id = setInterval(() => {}, 1000)
   cleanup.add(() => clearInterval(id))
   
   // ❌ Bad: Never cleared
   setInterval(() => {}, 1000)
   ```

3. **References:**
   ```typescript
   // ✅ Good: Clear references
   let cache: Map<string, Data> | null = new Map()
   cleanup.add(() => {
     cache?.clear()
     cache = null
   })
   
   // ❌ Bad: Never cleared
   const cache = new Map<string, Data>()
   // Cache grows indefinitely
   ```

### 3. Memory Monitoring

**Use Memory Tracker:**

```typescript
import { MemoryTracker } from '../utils/performance'

// In development
const tracker = new MemoryTracker()
tracker.start()

// Check stats
const stats = tracker.getStats()
console.log('Memory:', stats)

// Stop tracking
tracker.stop()
```

**Manual Monitoring:**

```bash
# Chrome DevTools
1. Open chrome://extensions/
2. Click "service worker" for background
3. Open "Memory" tab
4. Take heap snapshots
5. Compare snapshots for leaks
```

### 4. Data Limits

**Implement Caps:**

```typescript
// ✅ Good: Limit history
const MAX_MESSAGES = 100

function addMessage(message: ChatMessage) {
  messages.push(message)
  if (messages.length > MAX_MESSAGES) {
    messages.shift() // Remove oldest
  }
}

// ✅ Good: Limit log entries
class Logger {
  private maxEntries = 100
  private entries: LogEntry[] = []
  
  log(entry: LogEntry) {
    this.entries.push(entry)
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }
  }
}
```

---

## Network Performance

### 1. Rate Limiting ✅

**Already Implemented:**

```typescript
import { RateLimiters } from '../utils/rate-limit'

// OpenAI: 2 req/s, burst 10
await RateLimiters.openai.acquire()

// n8n: 5 req/s, burst 20
await RateLimiters.n8n.acquire()
```

### 2. Request Optimization

**Batch Requests:**

```typescript
import { createBatcher } from '../utils/performance'

const batcher = createBatcher<LogEntry>(
  async (entries) => {
    await api.sendLogs(entries)
  },
  { maxSize: 10, maxWaitMs: 1000 }
)

// Add entries individually
batcher.add(entry1)
batcher.add(entry2)
// Automatically batches
```

**Cache Responses:**

```typescript
const cache = new Map<string, Response>()

async function getCached(key: string, fetcher: () => Promise<Response>) {
  if (cache.has(key)) {
    return cache.get(key)!
  }
  
  const response = await fetcher()
  cache.set(key, response)
  
  // Expire after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000)
  
  return response
}
```

### 3. Streaming

**Already Implemented:**

```typescript
// OpenAI streaming for chat
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  stream: true,
})

for await (const chunk of stream) {
  const token = chunk.choices[0]?.delta?.content
  if (token) {
    onToken(token) // Send immediately
  }
}
```

**Benefits:**
- Faster perceived response time
- Better user experience
- Lower memory usage

---

## Monitoring & Profiling

### 1. Performance Monitoring

**Use Performance Utility:**

```typescript
import { measurePerformance } from '../utils/performance'

// Measure operation
const result = await measurePerformance('Create Workflow', async () => {
  return await n8n.createWorkflow(workflow)
})

// Automatically logs if > 5s
```

**Chrome Performance API:**

```typescript
// Mark important points
performance.mark('chat-send-start')
await sendMessage(text)
performance.mark('chat-send-end')

// Measure duration
performance.measure(
  'chat-send',
  'chat-send-start',
  'chat-send-end'
)

// Get measurements
const measures = performance.getEntriesByName('chat-send')
console.log('Duration:', measures[0].duration)
```

### 2. Profiling

**Chrome DevTools:**

```bash
# CPU Profiling
1. Open background service worker DevTools
2. Go to "Performance" tab
3. Click "Record"
4. Perform actions
5. Click "Stop"
6. Analyze flame graph

# Memory Profiling
1. Open "Memory" tab
2. Take "Heap snapshot"
3. Perform actions
4. Take another snapshot
5. Compare for leaks
```

**React DevTools Profiler:**

```bash
# Install React DevTools extension
1. Open DevTools
2. Go to "Profiler" tab
3. Click "Record"
4. Interact with UI
5. Click "Stop"
6. Analyze render times
```

### 3. Automated Monitoring

**Future: Telemetry:**

```typescript
// Send metrics (future feature)
interface Metric {
  name: string
  value: number
  tags: Record<string, string>
}

function trackMetric(metric: Metric) {
  // Send to analytics (if user opts in)
}

// Track key metrics
trackMetric({
  name: 'chat.response.time',
  value: duration,
  tags: { model: 'gpt-4o-mini' }
})
```

---

## Optimization Checklist

### Before Release

- [ ] Bundle size analyzed
- [ ] Large dependencies identified
- [ ] Lazy loading implemented where beneficial
- [ ] React components memoized
- [ ] Memory leaks checked
- [ ] Performance targets met

### After Release

- [ ] Real-world performance data collected
- [ ] User feedback on speed
- [ ] Memory usage monitored
- [ ] Slow operations identified
- [ ] Optimizations prioritized

---

## Common Performance Issues

### Issue: Slow Initial Load

**Symptoms:**
- Extension takes > 2s to load
- Content script slow to inject

**Solutions:**
1. Reduce bundle size
2. Lazy load heavy dependencies
3. Defer non-critical code
4. Split bundles properly

### Issue: High Memory Usage

**Symptoms:**
- Memory > 100MB
- Browser becomes slow
- Extension crashes

**Solutions:**
1. Implement data limits (messages, logs)
2. Clear old data regularly
3. Remove event listeners
4. Clear timers and intervals

### Issue: Slow Chat Responses

**Symptoms:**
- Responses take > 5s
- UI feels laggy
- Typing is slow

**Solutions:**
1. Check network latency
2. Optimize prompts (reduce tokens)
3. Use faster LLM model
4. Implement request caching

### Issue: UI Lag

**Symptoms:**
- Scroll is janky
- Typing is delayed
- Buttons are slow

**Solutions:**
1. Debounce input handlers
2. Throttle scroll handlers
3. Memoize components
4. Use virtual scrolling
5. Reduce re-renders

---

## Performance Tools

### Development Tools

```bash
# Bundle analyzer
yarn add -D rollup-plugin-visualizer

# Bundle size checker
yarn add -D @atomico/rollup-plugin-sizes

# Performance testing
yarn add -D lighthouse
```

### Browser Tools

- **Chrome DevTools Performance**: CPU profiling
- **Chrome DevTools Memory**: Heap snapshots
- **React DevTools Profiler**: Component render times
- **Chrome Task Manager**: Overall resource usage

### External Tools

- **bundle-phobia.com**: Check package sizes
- **bundlephobia.com**: Analyze bundle impact
- **Lighthouse**: Overall performance audit

---

## Best Practices

1. **Measure First, Optimize Second**
   - Profile before optimizing
   - Focus on bottlenecks
   - Verify improvements

2. **Optimize for User Perception**
   - Fast initial load
   - Instant feedback
   - Smooth interactions
   - Progressive enhancement

3. **Balance Size vs Features**
   - Add features that users need
   - Remove unused code
   - Lazy load optional features
   - Monitor bundle size

4. **Monitor Continuously**
   - Track performance metrics
   - Set up alerts
   - Review regularly
   - Iterate on improvements

---

## References

- [Chrome Extension Performance](https://developer.chrome.com/docs/extensions/mv3/performance/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Vite Bundle Analysis](https://vitejs.dev/guide/build.html)
- [Web Vitals](https://web.dev/vitals/)

---

**Last Updated:** 2025-01
