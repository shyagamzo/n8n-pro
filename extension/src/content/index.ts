function isN8nHost(): boolean {
  try {
    const { hostname, port } = window.location
    return hostname === 'localhost' && port === '5678'
  } catch {
    return false
  }
}

function injectTestButton(): void {
  if (document.getElementById('n8n-pro-test-button')) return

  const button = document.createElement('button')
  button.id = 'n8n-pro-test-button'
  button.textContent = 'n8n Pro: Hello'
  button.style.position = 'fixed'
  button.style.bottom = '16px'
  button.style.right = '16px'
  button.style.zIndex = '2147483647'
  button.style.padding = '8px 12px'
  button.style.borderRadius = '8px'
  button.style.background = '#4f46e5'
  button.style.color = '#fff'
  button.style.border = 'none'
  button.style.cursor = 'pointer'

  button.addEventListener('click', () => {
    console.info('n8n Pro button clicked')
  })

  document.body.appendChild(button)
}

if (isN8nHost()) {
  injectTestButton()
  console.info('n8n Pro content script initialized')
}





