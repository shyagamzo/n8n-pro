import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                // Main extension entry points
                background: resolve(__dirname, 'src/background/index.ts'),
                content: resolve(__dirname, 'src/content/index.ts'),
                panel: resolve(__dirname, 'src/panel/index.tsx'),
                options: resolve(__dirname, 'src/options/index.tsx'),
                popup: resolve(__dirname, 'src/popup/index.tsx'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        },
        // Browser extension specific build settings
        target: 'es2020',
        minify: 'terser',
        sourcemap: true
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@lib': resolve(__dirname, 'src/lib'),
            '@components': resolve(__dirname, 'src/lib/components'),
            '@services': resolve(__dirname, 'src/lib/services'),
            '@types': resolve(__dirname, 'src/lib/types'),
            '@utils': resolve(__dirname, 'src/lib/utils')
        }
    },
    define: {
        // Define global constants for the extension
        __EXTENSION_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
    }
});