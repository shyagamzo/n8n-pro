import type { ManifestV3Export } from '@crxjs/vite-plugin'

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'n8n Pro Extension',
  version: '0.1.0',
  description: 'AI-powered Chrome extension for creating n8n workflows through natural conversation',
  action: {
    default_popup: 'src/options/index.html',
    default_title: 'n8n Pro Extension'
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  content_scripts: [
    {
      matches: [
        'http://localhost:5678/*', 
        'https://localhost:5678/*',
        'http://127.0.0.1:5678/*',
        'https://127.0.0.1:5678/*',
        'https://*.n8n.cloud/*',
        'https://*.n8n.io/*'
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle'
    }
  ],
  options_page: 'src/options/index.html',
  host_permissions: [
    'http://localhost:5678/*',
    'https://localhost:5678/*',
    'http://127.0.0.1:5678/*',
    'https://127.0.0.1:5678/*',
    'https://*.n8n.cloud/*',
    'https://*.n8n.io/*',
    'https://api.openai.com/*'
  ],
  permissions: ['storage', 'scripting'],
  icons: {
    16: 'public/icons/icon16.png',
    48: 'public/icons/icon16.png',
    128: 'public/icons/icon16.png'
  },
  web_accessible_resources: [
    {
      resources: ['src/panel/*', 'src/lib/*'],
      matches: ['<all_urls>']
    }
  ]
}

export default manifest


