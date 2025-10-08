import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

// https://vite.dev/config/
export default defineConfig({
  // Ensure built asset URLs are relative to the extension, not the page origin
  base: '',
  plugins: [react(), crx({ manifest })],
  build: {
    // Optimize for Chrome extension
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Optimize chunk splitting for extensions
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ai': ['@langchain/core', '@langchain/openai', 'langchain'],
          'utils': ['marked', 'dompurify', 'zustand']
        },
        // Optimize asset naming for caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return `assets/css/[name]-[hash].${ext}`
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    // Optimize bundle size
    chunkSizeWarningLimit: 1000,
    // Tree shaking optimization
    treeshake: {
      moduleSideEffects: false
    }
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
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'marked',
      'dompurify',
      'zustand',
      '@langchain/core',
      '@langchain/openai'
    ],
    exclude: ['@crxjs/vite-plugin']
  },
  // CSS optimization
  css: {
    devSourcemap: false
  }
})
