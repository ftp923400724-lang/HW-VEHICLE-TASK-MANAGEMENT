import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '')

const resolveApiProxyTarget = (mode) => {
  const fallback = 'http://127.0.0.1:1000'
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || fallback

  try {
    return new URL(trimTrailingSlash(apiBaseUrl)).origin
  } catch {
    return fallback
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: resolveApiProxyTarget(mode),
        changeOrigin: true,
      },
    },
  },
}))
