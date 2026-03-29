import { useSyncExternalStore } from 'react'

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

const MOBILE_QUERY = '(max-width: 767px)'
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)'

function getDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia(MOBILE_QUERY).matches) return 'mobile'
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet'
  return 'desktop'
}

let listeners: Array<() => void> = []
let currentDevice = getDevice()

function subscribe(cb: () => void) {
  listeners.push(cb)
  return () => { listeners = listeners.filter(l => l !== cb) }
}

function notify() {
  const next = getDevice()
  if (next !== currentDevice) {
    currentDevice = next
    listeners.forEach(l => l())
  }
}

if (typeof window !== 'undefined') {
  const mql1 = window.matchMedia(MOBILE_QUERY)
  const mql2 = window.matchMedia(TABLET_QUERY)
  mql1.addEventListener('change', notify)
  mql2.addEventListener('change', notify)
}

function getSnapshot() { return currentDevice }

export function useDeviceType(): DeviceType {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'desktop' as DeviceType)
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches
}
