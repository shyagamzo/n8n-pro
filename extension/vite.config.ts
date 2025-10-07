import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

// https://vite.dev/config/
export default defineConfig({
  // Ensure built asset URLs are relative to the extension, not the page origin
  base: '',
  plugins: [react(), crx({ manifest })],
  server: {
    cors: { origin: '*' },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
    strictPort: true,
    host: 'localhost',
    port: 5173,
    origin: 'http://localhost:5173',
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: 5173,
    },
  },
})
