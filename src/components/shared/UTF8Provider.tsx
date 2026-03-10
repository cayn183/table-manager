import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'

/**
 * UTF-8 Global Charset Provider
 * Ensures all pages render with UTF-8 encoding for proper Umlaut support (äöü, etc.)
 * 
 * This component should be wrapped around your main App to guarantee charset is set at document level.
 */
export function UTF8Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force document charset attribute
    if (document.documentElement.getAttribute('lang') === 'de') {
      document.documentElement.lang = 'de'
    }
  }, [])

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      </Helmet>
      {children}
    </>
  )
}

export default UTF8Provider
