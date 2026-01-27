import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/apiClient'
import logger from '../utils/logger'
import sentry from '../sentryClient'

type User = { id: string; name?: string; email?: string } | null

type AuthResult = { ok: true; token: string; user: User } | { ok: false; error: string }

type AuthCtx = {
  user: User
  token: string | null
  login: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string) => Promise<AuthResult>
  logout: () => void
}

const KEY_TOKEN = 'tm_token'
const KEY_USER = 'tm_user'
// Migration is disabled by default. Manual import endpoint remains on the server.

const AuthContext = createContext<AuthCtx | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(KEY_TOKEN))
  const [user, setUser] = useState<User>(() => {
    try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null') as User } catch { return null }
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (token) localStorage.setItem(KEY_TOKEN, token)
    else localStorage.removeItem(KEY_TOKEN)
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem(KEY_USER, JSON.stringify(user))
    else localStorage.removeItem(KEY_USER)
  }, [user])

  // NOTE: Automatic migration has been removed. If you want to migrate localStorage
  // data for a single user, call POST /migration/import from a manual UI action.

  async function login(email: string, password: string): Promise<AuthResult> {
    try {
      const res = await api.post('/auth/login', { email, password })
      setToken(res.token)
      setUser(res.user)
      try { sentry.setUser({ id: res.user.id }) } catch (e) {}
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
      setToken(res.token)
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

  function logout() {
    setToken(null)
    setUser(null)
    try { sentry.clearUser() } catch (e) {}
    // Do not clear local user data here; we use user-scoped storage keys
    // so data of different accounts do not collide on the same browser.
    try { navigate('/login', { replace: true }) } catch (e) {}
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
