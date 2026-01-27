export type Level = 'debug' | 'info' | 'warn' | 'error'

const ENV_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase()
const LEVELS: Level[] = ['debug', 'info', 'warn', 'error']

const MAX_BYTES = parseInt(process.env.LOG_MAX_BYTES || String(5 * 1024 * 1024), 10) // default 5MB
const MAX_FILES = parseInt(process.env.LOG_MAX_FILES || '5', 10)

function time() {
  return new Date().toISOString()
}

function format(level: Level, tag: string | undefined, msg: any) {
  const prefix = `[${time()}]${tag ? ' [' + tag + ']' : ''} ${level.toUpperCase()}: `
  if (typeof msg === 'string') return prefix + msg
  try { return prefix + JSON.stringify(scrub(msg)) } catch { return prefix + String(msg) }
}

function scrub(obj: any): any {
  const SENSITIVE = new Set(['password', 'password_hash', 'Authorization', 'authorization', 'token', 'refresh_token'])
  try {
    if (obj == null) return obj
    if (typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(scrub)
    const out: any = {}
    for (const k of Object.keys(obj)) {
      try {
        if (SENSITIVE.has(k)) {
          out[k] = '<<REDACTED>>'
        } else {
          out[k] = scrub(obj[k])
        }
      } catch (e) {
        out[k] = '<<UNSERIALIZABLE>>'
      }
    }
    return out
  } catch (e) {
    return '<<SCRUB_ERROR>>'
  }
}

function shouldLog(level: Level) {
  const min = LEVELS.indexOf((ENV_LEVEL as Level) || 'info')
  return LEVELS.indexOf(level) >= min
}

// Optional persistent log file (useful when Docker logs aren't available in the UI)
let logFilePath: string | null = null
let fs: any = null
let path: any = null
try {
  fs = require('fs')
  path = require('path')
  const candidate = process.env.LOG_FILE || '/app/data/backend.log'
  const dir = path.dirname(candidate)
  if (fs.existsSync(dir)) {
    logFilePath = candidate
  }
} catch (e) {
  logFilePath = null
}

function rotateIfNeededSync() {
  if (!logFilePath || !fs) return
  try {
    if (!fs.existsSync(logFilePath)) return
    const st = fs.statSync(logFilePath)
    if (st.size < MAX_BYTES) return

    // rotate: move .(n-1) -> .n, then rename current -> .1
    for (let i = MAX_FILES - 1; i >= 1; i--) {
      const src = `${logFilePath}.${i}`
      const dst = `${logFilePath}.${i + 1}`
      if (fs.existsSync(src)) {
        try { fs.renameSync(src, dst) } catch (e) { /* ignore */ }
      }
    }
    // rotate current
    try { fs.renameSync(logFilePath, `${logFilePath}.1`) } catch (e) { /* ignore */ }
    // create new empty file
    try { fs.closeSync(fs.openSync(logFilePath, 'w')) } catch (e) { /* ignore */ }
  } catch (e) {
    // ignore rotation errors
  }
}

function appendToFile(msg: string) {
  if (!logFilePath || !fs) return
  try {
    rotateIfNeededSync()
    fs.appendFileSync(logFilePath, msg + '\n')
  } catch (e) {
    // ignore write errors
  }
}

const logger = {
  debug: (tag: string | undefined, ...args: any[]) => {
    if (!shouldLog('debug')) return
    const msg = format('debug', tag, args.length > 1 ? args : args[0])
    console.debug(msg)
    appendToFile(msg)
  },
  info: (tag: string | undefined, ...args: any[]) => {
    if (!shouldLog('info')) return
    const msg = format('info', tag, args.length > 1 ? args : args[0])
    console.info(msg)
    appendToFile(msg)
  },
  warn: (tag: string | undefined, ...args: any[]) => {
    if (!shouldLog('warn')) return
    const msg = format('warn', tag, args.length > 1 ? args : args[0])
    console.warn(msg)
    appendToFile(msg)
  },
  error: (tag: string | undefined, ...args: any[]) => {
    if (!shouldLog('error')) return
    const msg = format('error', tag, args.length > 1 ? args : args[0])
    console.error(msg)
    appendToFile(msg)
  }
}

export default logger
