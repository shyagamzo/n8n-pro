import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Ensure built asset URLs are relative to the extension, not the page origin
  base: '',
  plugins: [
    react(),
    crx({
      manifest,
      // Enable content script HMR
      contentScripts: {
        injectCss: true
      }
    })
  ],
  resolve: {
    alias: {
      // Path aliases for clean imports
      '@ui': path.resolve(__dirname, './src/ui'),
      '@ai': path.resolve(__dirname, './src/ai'),
      '@n8n': path.resolve(__dirname, './src/n8n'),
      '@platform': path.resolve(__dirname, './src/platform'),
      '@events': path.resolve(__dirname, './src/events'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@loom': path.resolve(__dirname, './src/loom'),
      '@services': path.resolve(__dirname, './src/services'),
      // Stub out Node.js modules that LangGraph tries to use
      // These aren't needed for browser/extension environment
      'node:async_hooks': new URL('./src/shared/stubs/async_hooks.ts', import.meta.url).pathname,
    },
  },
  build: {
    // Prevent invalid chrome-extension:// URLs in production
    rollupOptions: {
      output: {
        // Use relative paths for assets
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
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
