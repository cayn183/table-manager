import React, { createContext, useContext, useState, useCallback } from 'react'

export interface EventTab {
  key: string
  label: string
  icon: string
}

interface EventTabContextValue {
  /** Visible module tabs for the current event */
  tabs: EventTab[]
  /** Currently active tab key */
  activeTab: string
  /** Set the active tab (called from BottomTabBar) */
  setActiveTab: (key: string) => void
  /** Register event tabs (called from event detail components) */
  setEventTabs: (tabs: EventTab[], activeTab: string, onTabChange: (key: string) => void) => void
  /** Clear event tabs (called on unmount) */
  clearEventTabs: () => void
}

const EventTabContext = createContext<EventTabContextValue | null>(null)

export function EventTabProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<EventTab[]>([])
  const [activeTab, setActiveTabState] = useState('')
  const [onTabChange, setOnTabChange] = useState<((key: string) => void) | null>(null)

  const setEventTabs = useCallback((newTabs: EventTab[], active: string, callback: (key: string) => void) => {
    setTabs(newTabs)
    setActiveTabState(active)
    // Wrap in function to avoid React calling it as an updater
    setOnTabChange(() => callback)
  }, [])

  const clearEventTabs = useCallback(() => {
    setTabs([])
    setActiveTabState('')
    setOnTabChange(null)
  }, [])

  const setActiveTab = useCallback((key: string) => {
    setActiveTabState(key)
    onTabChange?.(key)
  }, [onTabChange])

  return (
    <EventTabContext.Provider value={{ tabs, activeTab, setActiveTab, setEventTabs, clearEventTabs }}>
      {children}
    </EventTabContext.Provider>
  )
}

export function useEventTabs() {
  const ctx = useContext(EventTabContext)
  if (!ctx) throw new Error('useEventTabs must be used within EventTabProvider')
  return ctx
}
