/**
 * Test button for workflow creation
 * TEMPORARY - Remove before production
 */

/**
 * Create and inject test button
 */
export function createTestButton(mountId: string): HTMLButtonElement 
{
  // Check if already exists
  const existing = document.getElementById('n8n-pro-test-trigger')
  if (existing) return existing as HTMLButtonElement

  const testButton = document.createElement('button')
  testButton.id = 'n8n-pro-test-trigger'
  testButton.innerHTML = '🧪'
  testButton.title = 'Test workflow creation'

  // Apply styles
  applyTestButtonStyles(testButton)

  // Add interaction handlers
  addTestButtonEffects(testButton)

  // Add click handler
  testButton.addEventListener('click', async () => 
{
    const React = await import('react')
    const { ensureMountRoot, mountReactOnce } = await import('@ui/mount')
    const { default: ChatContainer } = await import('./chat/ChatContainer')
    const { useChatStore } = await import('@ui/chatStore')
    const { chat } = await import('@services/chat')

    // Mount and open panel first
    const container = ensureMountRoot(mountId)
    mountReactOnce(container, React.createElement(ChatContainer))
    useChatStore.getState().setOpen(true)

    // Clear session and send test message
    setTimeout(() => 
{
      useChatStore.getState().clearSession()
      setTimeout(() => 
{
        chat.send(
          'Create a workflow which will send me a joke email every morning ' +
          '8AM, automatically, send through Gmail to shyagam@gmail.com. Generate both the jokes and the email subject using LLM. ' +
          'Use gpt-4o-mini as the model'
        )
      }, 100)
    }, 200)
  })

  return testButton
}

/**
 * Apply styles to test button
 */
function applyTestButtonStyles(button: HTMLButtonElement): void 
{
  const testColor1 = '#a78bfa' // purple-400
  const testColor2 = '#8b5cf6' // purple-500

  button.style.position = 'fixed'
  button.style.bottom = '20px'
  button.style.right = '180px' // Position to the left of the trigger button
  button.style.zIndex = '2147483647'
  button.style.width = '48px'
  button.style.height = '48px'
  button.style.padding = '0'
  button.style.borderRadius = '50%'
  button.style.background = `linear-gradient(135deg, color-mix(in srgb, ${testColor1} 90%, black) 0%, color-mix(in srgb, ${testColor2} 85%, black) 100%)`
  button.style.color = '#fff'
  button.style.border = '1px solid rgba(255, 255, 255, 0.2)'
  button.style.cursor = 'pointer'
  button.style.fontSize = '20px'
  button.style.boxShadow = `0 8px 24px color-mix(in srgb, ${testColor2} 40%, transparent), 0 4px 12px rgba(0, 0, 0, 0.3)`
  button.style.transition = 'all 0.3s ease'
  button.style.display = 'flex'
  button.style.alignItems = 'center'
  button.style.justifyContent = 'center'
  button.style.backdropFilter = 'blur(10px)'
  button.style.fontFamily = 'system-ui, -apple-system, sans-serif'
}

/**
 * Add hover and interaction effects to test button
 */
function addTestButtonEffects(button: HTMLButtonElement): void 
{
  const testColor2 = '#8b5cf6' // purple-500

  button.addEventListener('mouseenter', () => 
{
    button.style.transform = 'translateY(-4px) scale(1.05)'
    button.style.boxShadow = `0 12px 32px color-mix(in srgb, ${testColor2} 50%, transparent), 0 6px 16px rgba(0, 0, 0, 0.4)`
  })

  button.addEventListener('mouseleave', () => 
{
    button.style.transform = 'translateY(0) scale(1)'
    button.style.boxShadow = `0 8px 24px color-mix(in srgb, ${testColor2} 40%, transparent), 0 4px 12px rgba(0, 0, 0, 0.3)`
  })

  button.addEventListener('mousedown', () => 
{
    button.style.transform = 'translateY(-2px) scale(1.02)'
  })

  button.addEventListener('mouseup', () => 
{
    button.style.transform = 'translateY(-4px) scale(1.05)'
  })
}

