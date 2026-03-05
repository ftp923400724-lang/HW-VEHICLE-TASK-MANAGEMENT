import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 1020,
  },
  build: {
    target: 'es2019',
    sourcemap: false,
    outDir: path.resolve('Z:/Vehicle/Positioning'),
    emptyOutDir: true
  },
})
