/**
 * Build config for the Node.js Vite plugin (CJS + ESM)
 * Outputs: dist/index.js (ESM), dist/index.cjs (CJS)
 */
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/node/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.js')
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't delete client.iife.js built in the previous step
    rollupOptions: {
      external: [
        'vite',
        'ws',
        '@anthropic-ai/sdk',
        '@code-inspector/core',
        'path',
        'fs',
        'os',
        'http',
        'https',
        'net',
        'child_process',
        'stream',
        'util',
        'events',
        'crypto',
        'url',
        'buffer'
      ]
    },
    target: ['node18', 'es2020'],
    sourcemap: true
  }
})
