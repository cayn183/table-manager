export type Level = 'debug' | 'info' | 'warn' | 'error'

const ENV_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase()
const LEVELS: Level[] = ['debug', 'info', 'warn', 'error']

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
try {
  const candidate = process.env.LOG_FILE || '/app/data/backend.log'
  // only use file logging if the directory exists and is writable
  const fs = require('fs')
  const path = require('path')
  const dir = path.dirname(candidate)
  if (fs.existsSync(dir)) {
    logFilePath = candidate
  }
} catch (e) {
  logFilePath = null
}

function appendToFile(msg: string) {
  if (!logFilePath) return
  try {
    const fs = require('fs')
    fs.appendFile(logFilePath, msg + '\n', (err: any) => { /* ignore write errors */ })
  } catch (e) {
    // ignore
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
