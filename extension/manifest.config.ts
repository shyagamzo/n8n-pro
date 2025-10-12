import type { ManifestV3Export } from '@crxjs/vite-plugin'

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'n8n Pro Extension',
  version: '0.0.1',
  description: 'Dev scaffold for n8n assistant extension',
  action: {
    default_popup: 'src/entries/options/index.html'
  },
  background: {
    service_worker: 'src/entries/background/index.ts',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['http://localhost:5678/*', 'https://localhost:5678/*'],
      js: ['src/entries/content/index.ts'],
      run_at: 'document_idle'
    }
  ],
  options_page: 'src/entries/options/index.html',
  host_permissions: [
    'http://localhost:5678/*',
    'https://localhost:5678/*',
    'http://127.0.0.1:5678/*',
    'https://127.0.0.1:5678/*'
  ],
  permissions: ['storage', 'scripting'],
  web_accessible_resources: [
    {
      resources: ['assets/*', 'src/*'],
      matches: ['<all_urls>']
    }
  ]
}

export default manifest


