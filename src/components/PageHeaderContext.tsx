import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'

interface PageHeaderContextType {
  /** Page title shown in the header (e.g. "Tischplaner", "Event laden") */
  pageTitle: string | null
  /** Optional icon/emoji shown before the title */
  pageIcon: string | null
  /** Additional React elements rendered in the center/right of the header */
  headerContent: ReactNode | null
  /** Set the page title and optional icon */
  setPageTitle: (title: string | null, icon?: string | null) => void
  /** Set additional header content (controls, stats, etc.) */
  setHeaderContent: (content: ReactNode | null) => void
}

const PageHeaderContext = createContext<PageHeaderContextType>({
  pageTitle: null,
  pageIcon: null,
  headerContent: null,
  setPageTitle: () => {},
  setHeaderContent: () => {},
})

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitleState] = useState<string | null>(null)
  const [pageIcon, setPageIcon] = useState<string | null>(null)
  const [headerContent, setHeaderContentState] = useState<ReactNode | null>(null)

  const setPageTitle = useCallback((title: string | null, icon?: string | null) => {
    setPageTitleState(title)
    setPageIcon(icon ?? null)
  }, [])

  const setHeaderContent = useCallback((content: ReactNode | null) => {
    setHeaderContentState(content)
  }, [])

  return (
    <PageHeaderContext.Provider value={{ pageTitle, pageIcon, headerContent, setPageTitle, setHeaderContent }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  return useContext(PageHeaderContext)
}

/**
 * Hook to set page header info. Automatically cleans up on unmount.
 */
export function useSetPageHeader(title: string, icon?: string) {
  const { setPageTitle, setHeaderContent } = usePageHeader()

  useEffect(() => {
    setPageTitle(title, icon)
    return () => {
      setPageTitle(null)
      setHeaderContent(null)
    }
  }, [title, icon, setPageTitle, setHeaderContent])

  return { setHeaderContent }
}
