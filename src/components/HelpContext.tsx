import React, { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

export type HelpTab = 'home' | 'room' | 'events' | 'rooms' | 'togo' | 'profile'

interface HelpContextType {
  isOpen: boolean
  activeTab: HelpTab
  openHelp: (tab?: HelpTab) => void
  closeHelp: () => void
}

const HelpContext = createContext<HelpContextType>({
  isOpen: false,
  activeTab: 'home',
  openHelp: () => {},
  closeHelp: () => {},
})

export function useHelp() {
  return useContext(HelpContext)
}

function detectTabFromPath(pathname: string): HelpTab {
  if (pathname.match(/\/app\/events\/[^/]+/)) return 'room'
  if (pathname.match(/\/app\/rooms\/[^/]+/)) return 'room'
  if (pathname === '/app/events' || pathname.startsWith('/app/events')) return 'events'
  if (pathname === '/app/rooms' || pathname.startsWith('/app/rooms')) return 'rooms'
  if (pathname.startsWith('/app/togo')) return 'togo'
  if (pathname.startsWith('/app/profile')) return 'profile'
  return 'home'
}

export function HelpProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<HelpTab>('home')

  const openHelp = useCallback((tab?: HelpTab) => {
    setActiveTab(tab ?? detectTabFromPath(location.pathname))
    setIsOpen(true)
  }, [location.pathname])

  const closeHelp = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <HelpContext.Provider value={{ isOpen, activeTab, openHelp, closeHelp }}>
      {children}
    </HelpContext.Provider>
  )
}
