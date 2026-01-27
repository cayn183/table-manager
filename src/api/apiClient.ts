import logger from '../utils/logger'

// Prefer build-time VITE_API_URL, but fall back at runtime to the current host
// (useful when the frontend is served from a container but the backend lives
// on the same host network). This avoids calling `localhost` from the browser
// which would point to the user's machine instead of the backend container.
const BUILD_BASE = (import.meta as any).env?.VITE_API_URL
let BASE = BUILD_BASE
if (!BASE) {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const proto = window.location.protocol
      const host = window.location.hostname
      BASE = `${proto}//${host}:4000`
    }
  } catch (e) {
    BASE = 'http://localhost:4000'
  }
}

type Opts = { token?: string }

async function request(method: string, path: string, body?: any, opts: Opts = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`
  // generate a short request id for tracing (frontend-generated if not provided by network)
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
  headers['X-Request-Id'] = requestId
  logger.debug('api', { requestId, method, path, body: body ? (typeof body === 'string' ? body : '[object]') : undefined })
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch (e: any) {
    logger.error('api', { requestId, method, path, error: e && e.message ? e.message : String(e) })
    throw e
  }
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (e) {
    data = { text }
  }
  if (!res.ok) {
    const err = data && (data.error || data.message) ? (data.error || data.message) : `Request failed (${res.status})`
    logger.error('api', { requestId, method, path, status: res.status, body: data })
    const e = new Error(err) as any
    e.status = res.status
    e.body = data
    throw e
  }
  return data
}

export const api = {
  post: (path: string, body?: any, token?: string) => request('POST', path, body, { token }),
  get: (path: string, token?: string) => request('GET', path, undefined, { token }),
  del: (path: string, token?: string) => request('DELETE', path, undefined, { token }),
}

export default api
