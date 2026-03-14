import axios from 'axios'
import tokenHelper from '@/utils/token'
import { clearToken } from '@/utils/tokenTransfer'

const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_NAME || 'token'
const ACCESS_TOKEN_STORAGE_KEY = import.meta.env.VITE_APP_ACCESS_TOKEN_KEY || 'app_access_token'
const ACCESS_TOKEN_QUERY_KEYS = [
  'accessToken',
  'Access-Token',
  'access_token',
  'appAccessToken',
  'app_access_token'
]
const TOKEN_EXPIRED_REDIRECT_URL =
  import.meta.env.VITE_TOKEN_EXPIRED_REDIRECT ||
  import.meta.env.VITE_TOKEN_EXPIRED_REDIRECT_ADDRESS ||
  import.meta.env.VITE_REDIRECT_ADDRESS ||
  ''
const IS_DEV_MODE = Boolean(import.meta.env.DEV)
const DEV_SUPER_ADMIN_ENABLED =
  IS_DEV_MODE && String(import.meta.env.VITE_DEV_SUPER_ADMIN_ENABLED ?? '1') !== '0'

const ENV_CONFIG = {
  API_BASE_URL:
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://192.168.2.108:1090',
  ACCESS_TOKEN:
    import.meta.env.VITE_ACCESS_TOKEN ||
    (IS_DEV_MODE ? import.meta.env.VITE_DEV_SUPER_ADMIN_ACCESS_TOKEN || '' : ''),
  REQUEST_TIMEOUT: 10000
}

const readFromStorage = (storageType) => {
  if (typeof window === 'undefined') return ''
  try {
    const storage = window[storageType]
    return storage?.getItem(ACCESS_TOKEN_STORAGE_KEY) || ''
  } catch (error) {
    return ''
  }
}

const persistAccessToken = (token) => {
  if (!token) return
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
  } catch (error) {
    // ignore
  }
  try {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
  } catch (error) {
    // ignore
  }
}

const stripAccessTokenFromUrl = () => {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    let changed = false
    ACCESS_TOKEN_QUERY_KEYS.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key)
        changed = true
      }
    })
    if (changed) {
      window.history.replaceState(null, '', url.toString())
    }
  } catch (error) {
    // ignore
  }
}

const getQueryAccessToken = () => {
  if (typeof window === 'undefined') return ''
  try {
    const params = new URLSearchParams(window.location.search)
    for (const key of ACCESS_TOKEN_QUERY_KEYS) {
      const value = params.get(key)
      if (value) {
        persistAccessToken(value)
        stripAccessTokenFromUrl()
        return value
      }
    }
  } catch (error) {
    // ignore
  }
  return ''
}

const getAccessToken = () => {
  return (
    ENV_CONFIG.ACCESS_TOKEN ||
    getQueryAccessToken() ||
    readFromStorage('localStorage') ||
    readFromStorage('sessionStorage') ||
    ''
  )
}

const axiosInstance = axios.create({
  baseURL: ENV_CONFIG.API_BASE_URL,
  timeout: ENV_CONFIG.REQUEST_TIMEOUT
})

axiosInstance.interceptors.request.use((config) => {
  const headers = (config.headers = config.headers || {})
  if (!(config.data instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  const accessToken = getAccessToken()
  if (accessToken) {
    headers['Access-Token'] = accessToken
  }

  if (DEV_SUPER_ADMIN_ENABLED) {
    headers['X-Dev-Super-Admin'] = '1'
  }

  const userToken = tokenHelper.getToken()
  if (userToken) {
    headers['User-Token'] = userToken
    headers['Authorization'] = `Bearer ${userToken}`
    headers['Api-Auth'] = userToken
  }

  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const redirectToLogin = () => {
      if (IS_DEV_MODE) {
        console.warn('开发模式下跳过登录重定向')
        return
      }
      if (!TOKEN_EXPIRED_REDIRECT_URL) {
        return
      }
      try {
        clearToken()
        clearToken('localStorage', TOKEN_KEY)
        clearToken('sessionStorage', TOKEN_KEY)
      } catch (clearError) {
        console.warn('清理过期 token 失败', clearError)
      }
      window.location.replace(TOKEN_EXPIRED_REDIRECT_URL)
    }

    if (error.response) {
      const status = error.response.status
      if (status === 401 || status === 403) {
        redirectToLogin()
      }
      const message =
        error.response.data?.message ||
        error.response.data?.msg ||
        error.response.statusText ||
        '请求失败'
      return Promise.reject(new Error(`[${status}] ${message}`))
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时'))
    }
    return Promise.reject(error)
  }
)

const ensureUrl = (path) => {
  if (!path) {
    throw new Error('请求路径不能为空')
  }
  const isAbsolute = /^https?:\/\//i.test(path)
  if (isAbsolute) return path
  const trimmedBase = ENV_CONFIG.API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimmedBase}${normalizedPath}`
}

export const buildApiUrl = (path) => ensureUrl(path)

export const requestJson = async (path, options = {}) => {
  const { method = 'GET', params, body, headers: extraHeaders, timeout } = options
  const url = ensureUrl(path)
  const response = await axiosInstance.request({
    url,
    method,
    params,
    data: body,
    headers: extraHeaders,
    timeout: timeout ?? ENV_CONFIG.REQUEST_TIMEOUT
  })
  return response.data
}

export const unwrapResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'code')) {
    const numericCode = Number(payload.code)
    if (!Number.isNaN(numericCode) && numericCode < 1) {
      throw new Error(payload.msg || payload.message || '请求失败')
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'success') && payload.success === false) {
    throw new Error(payload.msg || payload.message || '请求失败')
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    const status = String(payload.status).toLowerCase()
    if (['error', 'fail', 'failed'].includes(status)) {
      throw new Error(payload.msg || payload.message || '请求失败')
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'result')) {
    return payload.result
  }

  return payload
}

export const normalizeListResult = (payload) => {
  const data = unwrapResponse(payload) ?? {}

  if (Array.isArray(data)) {
    return { list: data, total: data.length }
  }

  if (Array.isArray(data?.list)) {
    return {
      list: data.list,
      total: Number(data.total ?? data.count ?? data.list.length)
    }
  }

  if (Array.isArray(data?.records)) {
    return {
      list: data.records,
      total: Number(data.total ?? data.count ?? data.records.length)
    }
  }

  if (Array.isArray(data?.rows)) {
    return {
      list: data.rows,
      total: Number(data.total ?? data.count ?? data.rows.length)
    }
  }

  return { list: [], total: 0 }
}

export default {
  requestJson,
  buildApiUrl,
  unwrapResponse,
  normalizeListResult
}
