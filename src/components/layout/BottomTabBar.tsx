import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useEventTabs } from './EventTabContext'

const TAB_HEIGHT = 56

export default function BottomTabBar() {
  const { tabs: eventTabs, activeTab: eventActiveTab, setActiveTab: setEventActiveTab } = useEventTabs()

  const showEventTabs = eventTabs.length > 0
  const scrollable = showEventTabs && eventTabs.length > 5

  // Scroll-fade state
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftFade(el.scrollLeft > 4)
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    if (!scrollable) return
    const el = scrollRef.current
    if (!el) return
    // Initial check (needs a frame for layout)
    requestAnimationFrame(updateFades)
    el.addEventListener('scroll', updateFades, { passive: true })
    window.addEventListener('resize', updateFades)
    return () => {
      el.removeEventListener('scroll', updateFades)
      window.removeEventListener('resize', updateFades)
    }
  }, [scrollable, updateFades])

  // Auto-scroll active event tab into view
  useEffect(() => {
    if (!scrollable || !scrollRef.current) return
    const idx = eventTabs.findIndex(t => t.key === eventActiveTab)
    const btn = scrollRef.current.children[idx] as HTMLElement | undefined
    btn?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [eventActiveTab, scrollable, eventTabs])

  // No event-context tabs → BottomNav handles app-level navigation
  if (!showEventTabs) return null

  const fadeStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    [side]: 0,
    width: 32,
    pointerEvents: 'none',
    zIndex: 1,
    background: side === 'right'
      ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.95))'
      : 'linear-gradient(to left, transparent, rgba(255,255,255,0.95))',
    transition: 'opacity 0.2s',
  })

  return (
    <nav
      className="mobile-bottom-tab-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_HEIGHT,
        background: '#fff',
        borderTop: '1px solid #e2e8f0',
        zIndex: 2001,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
      }}
    >
      {showEventTabs && (
        <div style={{ position: 'relative', height: '100%' }}>
          {/* Left fade indicator */}
          {scrollable && showLeftFade && <div style={fadeStyle('left')} />}
          {/* Right fade indicator */}
          {scrollable && showRightFade && <div style={fadeStyle('right')} />}

          <div
            ref={scrollRef}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              height: '100%',
              overflowX: scrollable ? 'auto' : 'visible',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
            className="hide-scrollbar"
          >
            {eventTabs.map(tab => {
              const active = eventActiveTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setEventActiveTab(tab.key)}
                  style={{
                    flex: scrollable ? undefined : 1,
                    minWidth: scrollable ? 68 : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    background: active ? 'rgba(102,126,234,0.06)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: active ? '#667eea' : '#64748b',
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    padding: '0 6px',
                    transition: 'color 0.15s, background 0.15s',
                    position: 'relative',
                    WebkitTapHighlightColor: 'transparent',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {active && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '10%',
                      right: '10%',
                      height: 3,
                      borderRadius: '0 0 4px 4px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    }} />
                  )}
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}

export { TAB_HEIGHT }
