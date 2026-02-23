import logger from '../utils/logger'

// 1. Runtime config injected by Docker entrypoint (highest priority)
// 2. Build-time VITE_API_URL baked in by Vite (if set during build)
// 3. Fallback: derive from browser hostname + port 4000
const RUNTIME_BASE = typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.VITE_API_URL
const BUILD_BASE = (import.meta as any).env?.VITE_API_URL
let BASE = RUNTIME_BASE || BUILD_BASE
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
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include'
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
    const err = (data && data.code === 'EMAIL_NOT_VERIFIED')
      ? 'Bitte verifiziere zuerst deine E-Mail-Adresse, um neue Events anzulegen oder zu ändern.'
      : (data && (data.error || data.message) ? (data.error || data.message) : `Request failed (${res.status})`)
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
  patch: (path: string, body?: any, token?: string) => request('PATCH', path, body, { token }),
}

/** Make a request without credentials/cookies — used for public endpoints. */
export async function publicRequest(method: string, path: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
  headers['X-Request-Id'] = requestId
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e: any) {
    logger.error('api', { requestId, method, path, error: e?.message || String(e) })
    throw e
  }
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { text } }
  if (!res.ok) {
    const err = data?.error || data?.message || `Request failed (${res.status})`
    const e = new Error(err) as any
    e.status = res.status
    e.body = data
    throw e
  }
  return data
}

/** Upload a file via multipart/form-data (authenticated). */
export async function uploadFile(path: string, formData: FormData, token?: string) {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
  const headers: Record<string, string> = { 'X-Request-Id': requestId }
  if (token) headers['Authorization'] = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })
  } catch (e: any) {
    throw e
  }
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { text } }
  if (!res.ok) {
    const e = new Error(data?.error || `Upload failed (${res.status})`) as any
    e.status = res.status
    throw e
  }
  return data
}

export default api
