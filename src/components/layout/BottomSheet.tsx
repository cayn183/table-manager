import React, { useEffect, useRef, useState, useCallback } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Height hint: 'auto' (default), 'half', 'full' */
  height?: 'auto' | 'half' | 'full'
}

export default function BottomSheet({ open, onClose, title, children, height = 'auto' }: BottomSheetProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStartRef = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setDragY(0)
      requestAnimationFrame(() => setAnimating(true))
    } else {
      setAnimating(false)
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartRef.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartRef.current === null) return
    const dy = e.touches[0].clientY - dragStartRef.current
    if (dy > 0) setDragY(dy) // Only allow dragging down
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (dragY > 100) {
      onClose()
    }
    setDragY(0)
    dragStartRef.current = null
  }, [dragY, onClose])

  if (!visible) return null

  const maxH = height === 'full' ? '95vh' : height === 'half' ? '50vh' : '80vh'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: animating ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
        zIndex: 3000,
        transition: 'background 0.3s',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: maxH,
          background: '#fff',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          transform: animating ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragY > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle — swipe down to dismiss */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
        </div>
        {title && (
          <div style={{ padding: '4px 16px 12px', fontWeight: 700, fontSize: 16, borderBottom: '1px solid #f1f5f9' }}>
            {title}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
