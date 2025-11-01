/**
 * Browser-compatible AsyncLocalStorage polyfill.
 *
 * LangGraph requires AsyncLocalStorage to maintain execution context for features like interrupt().
 * This implementation provides a working polyfill for browser environments where Node.js's
 * async_hooks module is not available.
 *
 * Limitations:
 * - Does not track context across async boundaries like native AsyncLocalStorage
 * - Works for LangGraph's synchronous context propagation within runnables
 * - Context is maintained as long as execution stays within the run() callback chain
 */

export class AsyncLocalStorage<T = any> 
{
  private currentStore: T | undefined = undefined

  /**
   * Get the current store value.
   * Returns undefined if not within a run() context.
   */
  getStore(): T | undefined 
{
    return this.currentStore
  }

  /**
   * Run a callback with a specific store value.
   * Sets the store for the duration of the callback execution.
   *
   * For async callbacks, the context is maintained through the promise chain.
   */
  run<R>(store: T, callback: () => R): R 
{
    const previousStore = this.currentStore
    this.currentStore = store

    try 
{
      const result = callback()

      // If callback returns a Promise, chain cleanup to end of promise
      if (result instanceof Promise) 
{
        // Don't restore immediately - wait for promise to complete
        return (result as Promise<any>).then(
          (value) => 
{
            this.currentStore = previousStore
            return value
          },
          (error) => 
{
            this.currentStore = previousStore
            throw error
          }
        ) as R
      }

      // Synchronous execution - restore context immediately
      this.currentStore = previousStore
      return result
    }
 catch (error) 
{
      this.currentStore = previousStore
      throw error
    }
  }

  /**
   * Enter a specific store context.
   * Sets the store value for all subsequent operations until exit() or disable() is called.
   */
  enterWith(store: T): void 
{
    this.currentStore = store
  }

  /**
   * Exit the current store context and run a callback.
   */
  exit<R>(callback: () => R): R 
{
    const previousStore = this.currentStore
    this.currentStore = undefined

    try 
{
      return callback()
    }
 finally 
{
      this.currentStore = previousStore
    }
  }

  /**
   * Disable and clear the current store.
   */
  disable(): void 
{
    this.currentStore = undefined
  }
}

