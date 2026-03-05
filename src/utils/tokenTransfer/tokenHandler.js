// src/utils/tokenTransfer/tokenHandler.js

/**
 * 构建标准的令牌载荷
 * @param {string} token - 身份令牌
 * @returns {{token: string, apiAuth: string, timestamp: number, expire: number}}
 */
const buildTokenPayload = (token) => ({
  token,
  apiAuth: token,
  timestamp: Date.now(),
  expire: Date.now() + 5 * 60 * 1000 // 5 分钟有效期
})

/**
 * 将令牌写入指定 window.name
 * @param {string} token
 * @param {Window} targetWindow
 * @returns {boolean}
 */
export const attachTokenToWindow = (token, targetWindow = window) => {
  if (!token || !targetWindow) {
    console.warn('【tokenTransfer】attachTokenToWindow 参数不完整')
    return false
  }
  const payload = buildTokenPayload(token)
  try {
    targetWindow.name = JSON.stringify(payload)
    return true
  } catch (error) {
    console.warn('【tokenTransfer】JSON 序列化失败，降级为原始 token', error)
    try {
      targetWindow.name = token
      return true
    } catch (fallbackError) {
      console.error('【tokenTransfer】写入 window.name 失败', fallbackError)
      return false
    }
  }
}

/**
 * 携带令牌跳转到目标页面（当前窗口）
 * @param {string} token
 * @param {string} target
 * @returns {boolean}
 */
export const redirectWithToken = (token, target) => {
  if (!token || !target) {
    console.error('【tokenTransfer】token 和目标地址为必填项')
    return false
  }

  if (!attachTokenToWindow(token, window)) {
    return false
  }

  window.location.replace(target)
  return true
}

/**
 * 新开窗口并传递令牌
 * @param {string} token
 * @param {string} target
 * @param {string} features - window.open 的第三个参数
 * @returns {boolean}
 */
export const openWindowWithToken = (token, target, features = 'noopener=yes,noreferrer=yes') => {
  if (!token || !target) {
    console.error('【tokenTransfer】openWindowWithToken 参数不完整')
    return false
  }
  const winRef = window.open(target, '_blank', features)
  if (!winRef) {
    console.warn('【tokenTransfer】浏览器阻止了新窗口或窗口打开失败')
    return false
  }
  if (!attachTokenToWindow(token, winRef)) {
    try {
      winRef.close()
    } catch (e) {
      // 忽略关闭失败
    }
    return false
  }
  return true
}

/**
 * 从 window.name 接收令牌信息并缓存到本地
 * @param {string} storageType - localStorage / sessionStorage
 * @param {string} storageKey - 缓存键名
 * @returns {object|string|null}
 */
export const receiveToken = (storageType = 'sessionStorage', storageKey = 'token') => {
  const storedData = window.name
  if (!storedData) {
    return null
  }

  let tokenInfo
  try {
    const payload = JSON.parse(storedData)
    if (payload.expire && Date.now() > payload.expire) {
      console.error('【tokenTransfer】令牌已过期')
      clearToken(storageType, storageKey)
      return null
    }
    tokenInfo = payload
  } catch (error) {
    tokenInfo = storedData
  }

  if (tokenInfo) {
    try {
      const storage = window[storageType]
      if (storage) {
        const value = typeof tokenInfo === 'object' ? JSON.stringify(tokenInfo) : tokenInfo
        storage.setItem(storageKey, value)
      }
    } catch (storageError) {
      console.error('【tokenTransfer】令牌缓存失败:', storageError)
    }
  }

  clearToken()

  return tokenInfo
}

/**
 * 从本地缓存读取令牌
 * @param {string} storageType
 * @param {string} storageKey
 * @returns {object|string|null}
 */
export const getCachedToken = (storageType = 'sessionStorage', storageKey = 'token') => {
  try {
    const storage = window[storageType]
    if (!storage) return null

    const value = storage.getItem(storageKey)
    if (!value) return null

    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  } catch (error) {
    console.warn(`【tokenTransfer】读取 ${storageType} 缓存失败:`, error)
    return null
  }
}

/**
 * 清除存储的令牌信息
 * @param {string} storageType
 * @param {string} storageKey
 */
export const clearToken = (storageType, storageKey) => {
  try {
    window.name = ''
  } catch (error) {
    console.warn('【tokenTransfer】清空 window.name 失败:', error)
  }

  try {
    if (storageType && storageKey) {
      const storage = window[storageType]
      if (storage) {
        storage.removeItem(storageKey)
      }
    }
  } catch (error) {
    console.error('【tokenTransfer】清除缓存失败:', error)
  }
}
