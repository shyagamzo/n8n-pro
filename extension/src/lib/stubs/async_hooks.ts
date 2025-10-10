/**
 * Stub for Node.js async_hooks module.
 *
 * LangGraph imports this module but doesn't require it for browser/extension environments.
 * This stub provides the minimal interface to prevent bundling errors.
 */

export class AsyncLocalStorage<T = any> {
  getStore(): T | undefined {
    return undefined
  }

  run<R>(_store: T, callback: () => R): R {
    return callback()
  }

  enterWith(_store: T): void {
    // No-op in browser environment
  }

  exit<R>(callback: () => R): R {
    return callback()
  }

  disable(): void {
    // No-op in browser environment
  }
}

