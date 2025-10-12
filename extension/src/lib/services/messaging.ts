import type { ChatMessage } from '../types/chat'
import type { ApplyPlanRequest, BackgroundMessage } from '../types/messaging'
import { emitSystemError } from '../events/emitters'

/**
 * ChatPort - Manages chrome.runtime port connection for chat messaging.
 *
 * Handles connection lifecycle, reconnection, and safe message posting.
 */
export class ChatPort {
  private port: chrome.runtime.Port
  private disconnected = false

  constructor() {
    this.port = this.connect()
  }

  /**
   * Create and setup port connection
   */
  private connect(): chrome.runtime.Port {
    const port = chrome.runtime.connect({ name: 'chat' })
    port.onDisconnect.addListener(() => {
      this.disconnected = true
    })
    return port
  }

  /**
   * Ensure port is connected, reconnect if needed
   */
  private ensureConnected(): void {
    if (!this.disconnected) return

    try {
      this.port = this.connect()
      this.disconnected = false
    } catch (error) {
      // Extension context invalidated or background not available
      emitSystemError(error, 'ChatPort.ensureConnected', { action: 'reconnect' })
    }
  }

  /**
   * Safely post message with auto-reconnect
   */
  private safePost(data: Record<string, unknown>): void {
    try {
      this.port.postMessage(data)
    } catch (error) {
      // Reconnect once and retry
      emitSystemError(error, 'ChatPort.safePost', { action: 'post_attempt_1', data })
      this.ensureConnected()

      try {
        this.port.postMessage(data)
      } catch (retryError) {
        // Failed after retry - extension context likely invalidated
        emitSystemError(retryError, 'ChatPort.safePost', { action: 'post_attempt_2_failed', data })
      }
    }
  }

  /**
   * Send chat message to background worker
   */
  public sendChat(messages: ChatMessage[]): void {
    this.ensureConnected()
    this.safePost({ type: 'chat', messages })
  }

  /**
   * Send apply plan request to background worker
   */
  public applyPlan(req: ApplyPlanRequest): void {
    this.ensureConnected()
    this.safePost(req)
  }

  /**
   * Register callback for incoming messages
   */
  public onMessage(callback: (message: BackgroundMessage) => void): void {
    this.port.onMessage.addListener((m: BackgroundMessage) => callback(m))
  }

  /**
   * Disconnect port
   */
  public disconnect(): void {
    try {
      this.port.disconnect()
    } catch (error) {
      // Port already disconnected or extension context invalidated
      emitSystemError(error, 'ChatPort.disconnect', { action: 'disconnect' })
    }
  }
}
