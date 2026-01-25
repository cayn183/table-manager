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

const logger = {
  debug: (tag: string | undefined, ...args: any[]) => {
    if (!shouldLog('debug')) return
    console.debug(format('debug', tag, args.length > 1 ? args : args[0]))
  },
  info: (tag: string | undefined, ...args: any[]) => {
    if (!shouldLog('info')) return
    console.info(format('info', tag, args.length > 1 ? args : args[0]))
  },
  warn: (tag: string | undefined, ...args: any[]) => {
    if (!shouldLog('warn')) return
    console.warn(format('warn', tag, args.length > 1 ? args : args[0]))
  },
  error: (tag: string | undefined, ...args: any[]) => {
    if (!shouldLog('error')) return
    console.error(format('error', tag, args.length > 1 ? args : args[0]))
  }
}

export default logger
