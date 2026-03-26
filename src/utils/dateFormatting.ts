/**
 * Date formatting utilities for German locale
 * Provides dd.mm.yy and dd.mm.yyyy formats
 */

/**
 * Parse date string in various formats
 */
function parseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  
  let d: Date | null = null
  
  // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    d = new Date(dateStr)
  } 
  // German format: dd.mm.yyyy or dd.mm.yy
  else if (/^\d{2}\.\d{2}\.\d{2,4}$/.test(dateStr)) {
    const parts = dateStr.split('.')
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    let year = parseInt(parts[2], 10)
    
    // Convert 2-digit year to 4-digit
    if (year < 100) {
      year = year < 50 ? year + 2000 : year + 1900
    }
    
    d = new Date(year, month - 1, day)
  } 
  else {
    d = new Date(dateStr)
  }
  
  if (!d || isNaN(d.getTime())) return null
  return d
}

/**
 * Format date as dd.mm.yyyy
 */
export function formatDateLong(dateStr?: string | null): string | null {
  const d = parseDate(dateStr)
  if (!d) return null
  
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  
  return `${dd}.${mm}.${yyyy}`
}

/**
 * Format date as dd.mm.yy
 */
export function formatDateShort(dateStr?: string | null): string | null {
  const d = parseDate(dateStr)
  if (!d) return null
  
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  
  return `${dd}.${mm}.${yy}`
}

/**
 * Format date as dd.mm.yyyy by default, or dd.mm.yy if compact=true
 */
export function formatDate(dateStr?: string | null, compact: boolean = false): string | null {
  return compact ? formatDateShort(dateStr) : formatDateLong(dateStr)
}

/**
 * Format DateTime as dd.mm.yyyy HH:mm
 */
export function formatDateTimeDE(dateStr?: string | null): string | null {
  const d = parseDate(dateStr)
  if (!d) return null
  
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

/**
 * Format DateTime as dd.mm.yy HH:mm (compact)
 */
export function formatDateTimeShortDE(dateStr?: string | null): string | null {
  const d = parseDate(dateStr)
  if (!d) return null
  
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  
  return `${dd}.${mm}.${yy} ${hh}:${min}`
}

/**
 * Legacy function - kept for backwards compatibility with existing code
 * Formats as dd.mm.yyyy
 */
export function formatDateDE(dateStr?: string | null): string | null {
  return formatDateLong(dateStr)
}
