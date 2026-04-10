import { requestJson } from '@/api/http'

export {
  requestJson,
  buildApiUrl,
  unwrapResponse,
  normalizeListResult
} from '@/api/http'

export { default } from '@/api/http'

export function apiRequest(config = {}) {
  const {
    url,
    method = 'GET',
    params,
    data,
    body,
    headers,
    timeout,
    signal,
  } = config

  return requestJson(url, {
    method,
    params,
    body: body ?? data,
    headers,
    timeout,
    signal,
  })
}
