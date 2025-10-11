function isN8nHost(): boolean
{
  try
  {
    const { hostname, port } = window.location
    return hostname === 'localhost' && port === '5678'
  }
  catch
  {
    return false
  }
}

function injectTriggerAndPanel(): void
{
  if (document.getElementById('n8n-pro-trigger')) return

  const mountId = 'n8n-pro-mount-root'

  const trigger = document.createElement('button')
  trigger.id = 'n8n-pro-trigger'
  trigger.innerHTML = '<span style="font-size: 1.2em; margin-right: 6px;">🤖</span><span>n8n Assistant</span>'

  // Get CSS variable values
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#ff6d5a'
  const primaryShade = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-shade').trim() || '#e55a47'

  trigger.style.position = 'fixed'
  trigger.style.bottom = '20px'
  trigger.style.right = '20px'
  trigger.style.zIndex = '2147483647'
  trigger.style.padding = '12px 20px'
  trigger.style.borderRadius = '12px'
  trigger.style.background = `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 90%, black) 0%, color-mix(in srgb, ${primaryShade} 85%, black) 100%)`
  trigger.style.color = '#fff'
  trigger.style.border = '1px solid rgba(255, 255, 255, 0.2)'
  trigger.style.cursor = 'pointer'
  trigger.style.fontWeight = '500'
  trigger.style.fontSize = '14px'
  trigger.style.boxShadow = `0 8px 24px color-mix(in srgb, ${primaryColor} 40%, transparent), 0 4px 12px rgba(0, 0, 0, 0.3)`
  trigger.style.transition = 'all 0.3s ease'
  trigger.style.display = 'flex'
  trigger.style.alignItems = 'center'
  trigger.style.backdropFilter = 'blur(10px)'
  trigger.style.fontFamily = 'system-ui, -apple-system, sans-serif'

  trigger.addEventListener('mouseenter', () => {
    trigger.style.transform = 'translateY(-4px) scale(1.05)'
    trigger.style.boxShadow = `0 12px 32px color-mix(in srgb, ${primaryColor} 50%, transparent), 0 6px 16px rgba(0, 0, 0, 0.4)`
  })

  trigger.addEventListener('mouseleave', () => {
    trigger.style.transform = 'translateY(0) scale(1)'
    trigger.style.boxShadow = `0 8px 24px color-mix(in srgb, ${primaryColor} 40%, transparent), 0 4px 12px rgba(0, 0, 0, 0.3)`
  })

  trigger.addEventListener('mousedown', () => {
    trigger.style.transform = 'translateY(-2px) scale(1.02)'
  })

  trigger.addEventListener('mouseup', () => {
    trigger.style.transform = 'translateY(-4px) scale(1.05)'
  })

  trigger.addEventListener('click', async () =>
  {
    const React = await import('react')
    const { ensureMountRoot, mountReactOnce } = await import('../lib/ui/mount')
    const { default: ChatContainer } = await import('../panel/ChatContainer')
    const { useChatStore } = await import('../lib/state/chatStore')

    const container = ensureMountRoot(mountId)
    mountReactOnce(container, React.createElement(ChatContainer))
    useChatStore.getState().setOpen(true)
  })

  // TEMPORARY TEST BUTTON - Remove before production
  const testButton = document.createElement('button')
  testButton.id = 'n8n-pro-test-trigger'
  testButton.innerHTML = '🧪'
  testButton.title = 'Test workflow creation'

  testButton.style.position = 'fixed'
  testButton.style.bottom = '20px'
  testButton.style.right = '180px' // Position to the left of the trigger button
  testButton.style.zIndex = '2147483647'
  testButton.style.width = '40px'
  testButton.style.height = '40px'
  testButton.style.padding = '0'
  testButton.style.borderRadius = '50%'
  testButton.style.background = 'rgba(58, 59, 74, 0.8)'
  testButton.style.color = '#c5c7d0'
  testButton.style.border = '1px solid rgba(79, 81, 102, 0.6)'
  testButton.style.cursor = 'pointer'
  testButton.style.fontSize = '18px'
  testButton.style.transition = 'all 0.2s ease'
  testButton.style.display = 'flex'
  testButton.style.alignItems = 'center'
  testButton.style.justifyContent = 'center'
  testButton.style.opacity = '0.5'
  testButton.style.backdropFilter = 'blur(10px)'

  testButton.addEventListener('mouseenter', () => {
    testButton.style.opacity = '1'
    testButton.style.transform = 'scale(1.1)'
    testButton.style.borderColor = primaryColor
  })

  testButton.addEventListener('mouseleave', () => {
    testButton.style.opacity = '0.5'
    testButton.style.transform = 'scale(1)'
    testButton.style.borderColor = 'rgba(79, 81, 102, 0.6)'
  })

  testButton.addEventListener('click', async () =>
  {
    const React = await import('react')
    const { ensureMountRoot, mountReactOnce } = await import('../lib/ui/mount')
    const { default: ChatContainer } = await import('../panel/ChatContainer')
    const { useChatStore } = await import('../lib/state/chatStore')
    const { chat } = await import('../lib/services/chat')

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

  document.body.appendChild(trigger)
  document.body.appendChild(testButton)
}

if (isN8nHost())
{
  injectTriggerAndPanel()
  console.info('n8n Pro content script initialized')
}





