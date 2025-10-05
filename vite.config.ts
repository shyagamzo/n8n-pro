import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'copy-manifest',
            writeBundle() {
                // Copy manifest.json to dist folder
                if (existsSync('manifest.json')) {
                    copyFileSync('manifest.json', 'dist/manifest.json');
                }
            }
        }
    ],
    build: {
        rollupOptions: {
            input: {
                background: resolve(__dirname, 'src/background/index.ts'),
                content: resolve(__dirname, 'src/content/inject.ts'),
                panel: resolve(__dirname, 'src/panel/index.html'),
                options: resolve(__dirname, 'src/options/index.html')
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        },
        outDir: 'dist',
        emptyOutDir: true
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
});
