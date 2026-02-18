import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/apiClient'
import userStorage from '../utils/userStorage'
import logger from '../utils/logger'
import sentry from '../sentryClient'
import { syncUserData, hydrateUserData, syncUserDataOnUnload } from '../utils/sync'

type User = { id: string; name?: string; email?: string; email_verified?: boolean; is_admin?: boolean } | null

type AuthResult = { ok: true; token: string; user: User } | { ok: false; error: string }

type AuthCtx = {
  user: User
  token: string | null
  loading: boolean
  refreshUser: () => Promise<void>
  login: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string) => Promise<AuthResult>
  logout: (options?: { navigateTo?: string }) => void
}
// Migration is disabled by default. Manual import endpoint remains on the server.

const AuthContext = createContext<AuthCtx | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function bootstrap() {
      try {
        const res = await api.get('/auth/me')
        if (mounted && res && res.id) setUser(res)
      } catch (e) {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    bootstrap()
    return () => { mounted = false }
  }, [])

  async function refreshUser(): Promise<void> {
    try {
      const res = await api.get('/auth/me', token || undefined)
      if (res && res.id) setUser(res)
    } catch (e) {
      setUser(null)
    }
  }

  // NOTE: Automatic migration has been removed. If you want to migrate localStorage
  // data for a single user, call POST /migration/import from a manual UI action.

  async function login(email: string, password: string): Promise<AuthResult> {
    try {
      const res = await api.post('/auth/login', { email, password })
      setToken(res.token || null)
      setUser(res.user)
      try { sentry.setUser({ id: res.user.id }) } catch (e) {}
      // Try to load server-side events into user-scoped localStorage so
      // the UI shows existing events when logging in from another browser.
      try {
        await hydrateUserData(res.token || null, res.user.id)
      } catch (e) {
        // ignore fetch errors
      }
      // Automatic migration disabled — start with a clean state for new users
      return { ok: true, token: res.token, user: res.user }
    } catch (err: any) {
      const msg = err?.message || 'Login failed'
      logger.error('auth', { action: 'login', err })
      return { ok: false, error: msg }
    }
  }

  async function register(name: string, email: string, password: string): Promise<AuthResult> {
    try {
      const res = await api.post('/auth/register', { name, email, password })
      setToken(res.token || null)
      setUser(res.user)
      try { sentry.setUser({ id: res.user.id }) } catch (e) {}
      // Automatic migration disabled — start with a clean state for new users
      return { ok: true, token: res.token, user: res.user }
    } catch (err: any) {
      const msg = err?.message || 'Register failed'
      logger.error('auth', { action: 'register', err })
      return { ok: false, error: msg }
    }
  }

  function logout(options?: { navigateTo?: string }) {
    try {
      if (user && user.id) {
        void syncUserData(token, user.id)
      }
    } catch (e) {}
    try { void api.post('/auth/logout') } catch (e) {}
    setToken(null)
    setUser(null)
    try { sentry.clearUser() } catch (e) {}
    // Do not clear local user data here; we use user-scoped storage keys
    // so data of different accounts do not collide on the same browser.
    try { navigate(options?.navigateTo ?? '/login', { replace: true }) } catch (e) {}
  }

  // ── Idle auto-logout after 30 minutes of inactivity ──────────────────────
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000

  useEffect(() => {
    if (!user) return // only track when logged in

    function resetTimer() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        // Let active components (e.g. Room) save before logout
        window.dispatchEvent(new CustomEvent('app:auto-logout'))
        // Short delay so handlers can run synchronously
        setTimeout(() => {
          logout({ navigateTo: '/login' })
        }, 200)
      }, IDLE_TIMEOUT_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])
  // ─────────────────────────────────────────────────────────────────────────

  // Best-effort sync when the page is reloaded or closed. Uses fetch keepalive.
  useEffect(() => {
    function handleUnload() {
      try {
        if (user && user.id) {
          syncUserDataOnUnload(token, user.id)
        }
      } catch (e) {}
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [token, user])

  return (
    <AuthContext.Provider value={{ user, token, loading, refreshUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
