import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getMyClubs } from '../api/clubApi'
import type { Club } from '../types/club'

type ClubCtx = {
  clubs: Club[]
  loading: boolean
  activeClub: Club | null
  setActiveClubId: (id: string | null) => void
  refreshClubs: () => Promise<void>
}

const ClubContext = createContext<ClubCtx | undefined>(undefined)

const ACTIVE_CLUB_KEY = 'active_club_id'

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [activeClubId, setActiveClubIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_CLUB_KEY) } catch { return null }
  })

  const refreshClubs = useCallback(async () => {
    if (!user) { setClubs([]); setLoading(false); return }
    try {
      const data = await getMyClubs(token || undefined)
      setClubs(data)
      // If active club no longer exists in the list, reset
      if (activeClubId && !data.find(c => c.id === activeClubId)) {
        setActiveClubIdState(data.length > 0 ? data[0].id : null)
      }
    } catch {
      setClubs([])
    } finally {
      setLoading(false)
    }
  }, [user, token, activeClubId])

  useEffect(() => {
    refreshClubs()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function setActiveClubId(id: string | null) {
    setActiveClubIdState(id)
    try {
      if (id) localStorage.setItem(ACTIVE_CLUB_KEY, id)
      else localStorage.removeItem(ACTIVE_CLUB_KEY)
    } catch {}
  }

  const activeClub = clubs.find(c => c.id === activeClubId) || (clubs.length > 0 ? clubs[0] : null)

  return (
    <ClubContext.Provider value={{ clubs, loading, activeClub, setActiveClubId, refreshClubs }}>
      {children}
    </ClubContext.Provider>
  )
}

export function useClubs() {
  const c = useContext(ClubContext)
  if (!c) throw new Error('useClubs must be used inside ClubProvider')
  return c
}
