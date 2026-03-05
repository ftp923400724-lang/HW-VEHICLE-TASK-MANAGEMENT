// Unified token helper for VehicleLocator
import { receiveToken, getCachedToken as getTransferCachedToken } from '@/utils/tokenTransfer'

const env = import.meta.env || {}
const TOKEN_KEY = env.VITE_AUTH_TOKEN_NAME || 'token'

const normalizeValue = (payload) => {
  if (!payload) {
    return ''
  }
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload)
      return normalizeValue(parsed)
    } catch (error) {
      return payload
    }
  }
  if (typeof payload === 'object') {
    return (
      payload[TOKEN_KEY] ||
      payload.token ||
      payload.apiAuth ||
      payload.api_token ||
      payload['User-Token'] ||
      payload.userToken ||
      payload.AccessToken ||
      payload.accessToken ||
      ''
    )
  }
  return ''
}

export const persistToken = (token) => {
  if (!token) {
    return
  }
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch (error) {
    // ignore localStorage errors
  }
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token)
  } catch (error) {
    // ignore sessionStorage errors
  }
}

export const readBridgeToken = () => {
  const latestLocal = normalizeValue(receiveToken('localStorage', TOKEN_KEY))
  if (latestLocal) {
    return latestLocal
  }
  const latestSession = normalizeValue(receiveToken('sessionStorage', TOKEN_KEY))
  if (latestSession) {
    return latestSession
  }
  return ''
}

export const readQueryToken = () => {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get(TOKEN_KEY) || ''
  } catch (error) {
    return ''
  }
}

export const stripTokenFromUrl = () => {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(TOKEN_KEY)) {
      return
    }
    url.searchParams.delete(TOKEN_KEY)
    window.history.replaceState(null, '', url.toString())
  } catch (error) {
    // ignore
  }
}

export const getCachedToken = () => {
  const cachedLocal = normalizeValue(getTransferCachedToken('localStorage', TOKEN_KEY))
  if (cachedLocal) {
    return cachedLocal
  }
  const cachedSession = normalizeValue(getTransferCachedToken('sessionStorage', TOKEN_KEY))
  if (cachedSession) {
    return cachedSession
  }
  try {
    const storedLocal = window.localStorage.getItem(TOKEN_KEY)
    if (storedLocal) {
      return normalizeValue(storedLocal)
    }
  } catch (error) {
    // ignore
  }
  try {
    const storedSession = window.sessionStorage.getItem(TOKEN_KEY)
    if (storedSession) {
      return normalizeValue(storedSession)
    }
  } catch (error) {
    // ignore
  }
  return ''
}

export const getToken = () => {
  const bridgeToken = readBridgeToken()
  if (bridgeToken) {
    persistToken(bridgeToken)
    return bridgeToken
  }

  const queryToken = readQueryToken()
  if (queryToken) {
    persistToken(queryToken)
    stripTokenFromUrl()
    return queryToken
  }

  return getCachedToken()
}

export default {
  getToken,
  getCachedToken,
  persistToken,
  readBridgeToken,
  readQueryToken,
  stripTokenFromUrl,
  normalizeValue
}
