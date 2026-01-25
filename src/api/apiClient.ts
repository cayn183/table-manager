const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'

type Opts = { token?: string }

async function request(method: string, path: string, body?: any, opts: Opts = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (e) {
    data = { text }
  }
  if (!res.ok) {
    const err = data && (data.error || data.message) ? (data.error || data.message) : `Request failed (${res.status})`
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
