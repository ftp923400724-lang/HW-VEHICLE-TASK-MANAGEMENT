const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '')

const normalizeBaseUrl = (value, fallback = '/api') => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  return trimTrailingSlash(value.trim())
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export const isLocalRuntimeHost = (hostname = '') =>
  LOCAL_HOSTS.has(String(hostname).trim().toLowerCase())

export const resolveRuntimeEnv = () => {
  if (typeof window !== 'undefined' && isLocalRuntimeHost(window.location.hostname)) {
    return 'local'
  }
  const mode = String(import.meta.env?.MODE || '').toLowerCase()
  if (mode === 'xampp' || mode === 'local' || mode === 'development') {
    return 'local'
  }
  if (mode === 'online' || mode === 'production') {
    return 'production'
  }
  return mode || 'production'
}

export const LOCAL_API_BASE_URL = normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL, '/api')
export const ONLINE_API_BASE_URL = normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL, '/api')

export const resolveApiBaseUrl = () =>
  normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL, '/api')

export const API_BASE_URL = resolveApiBaseUrl()
