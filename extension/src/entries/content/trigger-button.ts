/**
 * Main trigger button for n8n assistant
 */

import { getPrimaryColor, getPrimaryShade } from './utils/theme'

/**
 * Create and inject the main trigger button
 */
export function createTriggerButton(mountId: string): HTMLButtonElement {
  // Check if already exists
  const existing = document.getElementById('n8n-pro-trigger')
  if (existing) return existing as HTMLButtonElement

  const trigger = document.createElement('button')
  trigger.id = 'n8n-pro-trigger'
  trigger.innerHTML = '<span style="font-size: 1.2em; margin-right: 6px;">🤖</span><span>n8n Assistant</span>'

  // Apply styles
  applyTriggerStyles(trigger)

  // Add interaction handlers
  addHoverEffects(trigger)

  // Add click handler
  trigger.addEventListener('click', async () => {
    const React = await import('react')
    const { ensureMountRoot, mountReactOnce } = await import('@ui/mount')
    const { default: ChatContainer } = await import('./chat/ChatContainer')
    const { useChatStore } = await import('@ui/chatStore')

    const container = ensureMountRoot(mountId)
    mountReactOnce(container, React.createElement(ChatContainer))
    useChatStore.getState().setOpen(true)
  })

  return trigger
}

/**
 * Apply styles to trigger button
 */
function applyTriggerStyles(button: HTMLButtonElement): void {
  const primaryColor = getPrimaryColor()
  const primaryShade = getPrimaryShade()

  button.style.position = 'fixed'
  button.style.bottom = '20px'
  button.style.right = '20px'
  button.style.zIndex = '2147483647'
  button.style.padding = '12px 20px'
  button.style.borderRadius = '12px'
  button.style.background = `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 90%, black) 0%, color-mix(in srgb, ${primaryShade} 85%, black) 100%)`
  button.style.color = '#fff'
  button.style.border = '1px solid rgba(255, 255, 255, 0.2)'
  button.style.cursor = 'pointer'
  button.style.fontWeight = '500'
  button.style.fontSize = '14px'
  button.style.boxShadow = `0 8px 24px color-mix(in srgb, ${primaryColor} 40%, transparent), 0 4px 12px rgba(0, 0, 0, 0.3)`
  button.style.transition = 'all 0.3s ease'
  button.style.display = 'flex'
  button.style.alignItems = 'center'
  button.style.backdropFilter = 'blur(10px)'
  button.style.fontFamily = 'system-ui, -apple-system, sans-serif'
}

/**
 * Add hover and interaction effects
 */
function addHoverEffects(button: HTMLButtonElement): void {
  const primaryColor = getPrimaryColor()

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-4px) scale(1.05)'
    button.style.boxShadow = `0 12px 32px color-mix(in srgb, ${primaryColor} 50%, transparent), 0 6px 16px rgba(0, 0, 0, 0.4)`
  })

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0) scale(1)'
    button.style.boxShadow = `0 8px 24px color-mix(in srgb, ${primaryColor} 40%, transparent), 0 4px 12px rgba(0, 0, 0, 0.3)`
  })

  button.addEventListener('mousedown', () => {
    button.style.transform = 'translateY(-2px) scale(1.02)'
  })

  button.addEventListener('mouseup', () => {
    button.style.transform = 'translateY(-4px) scale(1.05)'
  })
}

