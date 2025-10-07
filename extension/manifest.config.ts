import type { ManifestV3Export } from '@crxjs/vite-plugin'

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'n8n Pro Extension',
  version: '0.0.1',
  description: 'Dev scaffold for n8n assistant extension',
  action: {
    default_popup: 'src/options/index.html'
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['http://localhost:5678/*', 'https://localhost:5678/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle'
    }
  ],
  options_page: 'src/options/index.html',
  host_permissions: ['http://localhost:5678/*', 'https://localhost:5678/*'],
  permissions: ['storage', 'scripting']
}

export default manifest


