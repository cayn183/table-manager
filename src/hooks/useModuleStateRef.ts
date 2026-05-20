import { useRef, useCallback } from 'react'

export default function useModuleStateRef<T>(initial: T) {
  const dataRef = useRef<T>(initial)

  const setRef = useCallback((value: T) => {
    dataRef.current = value
  }, [])

  const updateRef = useCallback((fn: (cur: T) => T) => {
    dataRef.current = fn(dataRef.current)
  }, [])

  const getCurrentData = useCallback(() => dataRef.current, [])

  return { dataRef, setRef, updateRef, getCurrentData }
}
