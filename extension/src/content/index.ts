function isN8nHost(): boolean {
  try {
    const { hostname, port } = window.location
    return hostname === 'localhost' && port === '5678'
  } catch {
    return false
  }
}

function injectTriggerAndPanel(): void {
  if (document.getElementById('n8n-pro-trigger')) return

  const mountId = 'n8n-pro-mount-root'

  const trigger = document.createElement('button')
  trigger.id = 'n8n-pro-trigger'
  trigger.textContent = 'n8n Assistant'
  trigger.style.position = 'fixed'
  trigger.style.bottom = '16px'
  trigger.style.right = '16px'
  trigger.style.zIndex = '2147483647'
  trigger.style.padding = '8px 12px'
  trigger.style.borderRadius = '8px'
  trigger.style.background = '#4f46e5'
  trigger.style.color = '#fff'
  trigger.style.border = 'none'
  trigger.style.cursor = 'pointer'

  trigger.addEventListener('click', async () => {
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

if (isN8nHost()) {
  injectTriggerAndPanel()
  console.info('n8n Pro content script initialized')
}





