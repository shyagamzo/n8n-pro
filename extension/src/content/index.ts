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

  document.body.appendChild(trigger)
}

if (isN8nHost())
{
  injectTriggerAndPanel()
  console.info('n8n Pro content script initialized')
}





