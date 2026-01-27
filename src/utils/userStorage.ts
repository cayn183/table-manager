export function scopedKey(userId: string | null | undefined, key: string) {
  if (!userId) return `tm:${key}`
  return `tm:${userId}:${key}`
}

export function getItem(key: string, userId?: string | null) {
  try {
    return localStorage.getItem(scopedKey(userId, key))
  } catch (e) {
    return null
  }
}

export function setItem(key: string, value: string, userId?: string | null) {
  try {
    localStorage.setItem(scopedKey(userId, key), value)
  } catch (e) {
    // ignore
  }
}

export function removeItem(key: string, userId?: string | null) {
  try {
    localStorage.removeItem(scopedKey(userId, key))
  } catch (e) {
    // ignore
  }
}

export function clearAllForUser(userId: string) {
  try {
    const prefix = `tm:${userId}:`
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) toRemove.push(k)
    }
    toRemove.forEach(k => localStorage.removeItem(k))
  } catch (e) {}
}

export default { scopedKey, getItem, setItem, removeItem, clearAllForUser }
