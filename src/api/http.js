import axios from 'axios'
import tokenHelper from '@/utils/token'
import { clearToken } from '@/utils/tokenTransfer'
import { API_BASE_URL, isLocalRuntimeHost } from '@/api/apiBaseUrl'

const env = import.meta.env || {}
const IS_DEV_MODE = Boolean(env.DEV)
const IS_PROD_MODE = Boolean(env.PROD)
const LOCAL_LOGIN_URL = 'http://127.0.0.1:1010'
const ONLINE_LOGIN_URL = 'http://119.91.132.25:1010'
const runtimeHost = typeof window === 'undefined' ? '' : window.location.hostname
const USE_LOCAL_SERVER_ENV = isLocalRuntimeHost(runtimeHost)
const SHOULD_HARD_REDIRECT_TO_LOGIN = !USE_LOCAL_SERVER_ENV
const TOKEN_KEY = env.VITE_AUTH_TOKEN_NAME || 'token'
const APP_SECRET_STORAGE_KEY = env.VITE_APP_SECRET_STORAGE_KEY || 'app_secret'
const APP_SECRET_QUERY_KEYS = [
  'AppSecret',
  'appSecret',
  'app_secret',
  'accessToken',
  'Access-Token',
  'access_token',
  'appAccessToken',
  'app_access_token'
]
const DEFAULT_TOKEN_EXPIRED_REDIRECT_URL = USE_LOCAL_SERVER_ENV ? LOCAL_LOGIN_URL : ONLINE_LOGIN_URL
const TOKEN_EXPIRED_REDIRECT_URL =
  (
    USE_LOCAL_SERVER_ENV
      ? env.VITE_TOKEN_EXPIRED_REDIRECT_LOCAL || env.VITE_TOKEN_EXPIRED_REDIRECT_DEV
      : env.VITE_TOKEN_EXPIRED_REDIRECT_PROD
  ) ||
  env.VITE_TOKEN_EXPIRED_REDIRECT ||
  env.VITE_TOKEN_EXPIRED_REDIRECT_ADDRESS ||
  env.VITE_REDIRECT_ADDRESS ||
  DEFAULT_TOKEN_EXPIRED_REDIRECT_URL
const DEV_SUPER_ADMIN_ENABLED =
  IS_DEV_MODE && String(env.VITE_DEV_SUPER_ADMIN_ENABLED ?? '1') !== '0'
let accessTokenExpiredHandled = false

const ENV_CONFIG = {
  API_BASE_URL,
  APP_SECRET:
    env.VITE_APP_SECRET ||
    env.VITE_ACCESS_TOKEN ||
    (IS_PROD_MODE
      ? ''
      : env.VITE_DEV_APP_SECRET || env.VITE_DEV_SUPER_ADMIN_ACCESS_TOKEN || ''),
  REQUEST_TIMEOUT: 10000
}

const redirectToLogin = () => {
  if (!TOKEN_EXPIRED_REDIRECT_URL) {
    return
  }
  if (!SHOULD_HARD_REDIRECT_TO_LOGIN) {
    console.warn('当前为本地/开发环境，仍执行 token 过期重定向')
  }
  window.location.replace(TOKEN_EXPIRED_REDIRECT_URL)
}

const clearExpiredTokens = () => {
  try {
    clearToken()
    clearToken('localStorage', TOKEN_KEY)
    clearToken('sessionStorage', TOKEN_KEY)
    window.localStorage.removeItem(APP_SECRET_STORAGE_KEY)
    window.sessionStorage.removeItem(APP_SECRET_STORAGE_KEY)
  } catch (clearError) {
    console.warn('清理过期 token 失败', clearError)
  }
}

const handleAccessTokenExpired = (message) => {
  clearExpiredTokens()
  if (accessTokenExpiredHandled) {
    return
  }
  accessTokenExpiredHandled = true
  console.warn(message || '应用鉴权失效，准备跳转登录')
  redirectToLogin()
}

const readFromStorage = (storageType) => {
  if (typeof window === 'undefined') return ''
  try {
    const storage = window[storageType]
    return storage?.getItem(APP_SECRET_STORAGE_KEY) || ''
  } catch (error) {
    return ''
  }
}

const persistAppSecret = (appSecret) => {
  if (!appSecret) return
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(APP_SECRET_STORAGE_KEY, appSecret)
  } catch (error) {
    // ignore
  }
  try {
    window.sessionStorage.setItem(APP_SECRET_STORAGE_KEY, appSecret)
  } catch (error) {
    // ignore
  }
}

const stripAppSecretFromUrl = () => {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    let changed = false
    APP_SECRET_QUERY_KEYS.forEach((key) => {
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

const getQueryAppSecret = () => {
  if (typeof window === 'undefined') return ''
  const extractFromParams = (params) => {
    for (const key of APP_SECRET_QUERY_KEYS) {
      const value = params.get(key)
      if (value) {
        return value
      }
    }
    return ''
  }
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const fromSearch = extractFromParams(searchParams)
    if (fromSearch) {
      persistAppSecret(fromSearch)
      stripAppSecretFromUrl()
      return fromSearch
    }

    const rawHash = window.location.hash || ''
    const hashQueryIndex = rawHash.indexOf('?')
    if (hashQueryIndex >= 0) {
      const hashQuery = rawHash.slice(hashQueryIndex + 1)
      const hashParams = new URLSearchParams(hashQuery)
      const fromHash = extractFromParams(hashParams)
      if (fromHash) {
        persistAppSecret(fromHash)
        return fromHash
      }
    }
  } catch (error) {
    // ignore
  }
  return ''
}

const getAppSecret = () => {
  const runtimeAppSecret =
    getQueryAppSecret() ||
    readFromStorage('localStorage') ||
    readFromStorage('sessionStorage') ||
    ''
  return (
    runtimeAppSecret ||
    ENV_CONFIG.APP_SECRET ||
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

  const appSecret = getAppSecret()
  if (appSecret) {
    headers.AppSecret = appSecret
  } else if (SHOULD_HARD_REDIRECT_TO_LOGIN) {
    handleAccessTokenExpired('缺少应用 AppSecret')
    return Promise.reject(new Error('缺少应用 AppSecret'))
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
  (response) => {
    const payload = response?.data
    const code = Number(payload?.code)
    const msg = String(payload?.msg || payload?.message || '')
    const appAuthInvalid =
      code === -996 || /access-token.+过期/i.test(msg) || /app\s*secret.+(过期|无效|错误)/i.test(msg)
    if (appAuthInvalid) {
      handleAccessTokenExpired(msg || '应用鉴权失效')
      return Promise.reject(new Error(msg || '应用鉴权失效'))
    }
    return response
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      if (status === 401 || status === 403) {
        handleAccessTokenExpired(`请求鉴权失败（HTTP ${status}）`)
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
    const msg = payload.msg || payload.message || ''
    if (
      numericCode === -996 ||
      /access-token.+过期/i.test(String(msg)) ||
      /app\s*secret.+(过期|无效|错误)/i.test(String(msg))
    ) {
      handleAccessTokenExpired(msg || '应用鉴权失效')
      throw new Error(msg || '应用鉴权失效')
    }
    if (!Number.isNaN(numericCode) && numericCode < 1) {
      throw new Error(msg || '请求失败')
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
