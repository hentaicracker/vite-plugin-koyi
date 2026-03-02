/**
 * Build config for the browser client overlay (IIFE bundle)
 * Outputs: dist/client.iife.js
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/client/index.tsx'),
      formats: ['iife'],
      name: 'KoyiClient',
      fileName: () => 'client.iife.js'
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    },
    minify: 'esbuild',
    target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
    sourcemap: false
  },
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
