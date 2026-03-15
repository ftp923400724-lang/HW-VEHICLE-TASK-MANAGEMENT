const env = import.meta.env || {}

export const LOCAL_API_BASE_URL = 'http://127.0.0.1:1000/api'
export const ONLINE_API_BASE_URL = 'http://119.91.132.25:1000/api'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export const isLocalRuntimeHost = (hostname = '') =>
  LOCAL_HOSTS.has(String(hostname).trim().toLowerCase())

export const resolveRuntimeEnv = () => {
  if (typeof window !== 'undefined' && isLocalRuntimeHost(window.location.hostname)) {
    return 'local'
  }

  if (env.PROD || env.MODE === 'production') {
    return 'production'
  }

  if (env.DEV) {
    return 'local'
  }

  return 'production'
}

export const resolveApiBaseUrl = () => {
  const runtimeEnv = resolveRuntimeEnv()

  if (runtimeEnv === 'local') {
    return LOCAL_API_BASE_URL
  }

  return env.VITE_API_PROD_URL || env.VITE_API_PRODUCTION_URL || ONLINE_API_BASE_URL
}

export const API_BASE_URL = resolveApiBaseUrl()

