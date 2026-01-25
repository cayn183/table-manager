type Level = 'debug' | 'info' | 'warn' | 'error'

const ENV_LEVEL = (((import.meta as any).env?.VITE_LOG_LEVEL) || 'debug').toLowerCase()
const LEVELS: Level[] = ['debug', 'info', 'warn', 'error']

function time() {
  return new Date().toISOString()
}

function format(level: Level, tag: string | undefined, msg: any) {
  const prefix = `[${time()}]${tag ? ' [' + tag + ']' : ''} ${level.toUpperCase()}: `
  if (typeof msg === 'string') return prefix + msg
  try { return prefix + JSON.stringify(msg) } catch { return prefix + String(msg) }
}

function shouldLog(level: Level) {
  const min = LEVELS.indexOf((ENV_LEVEL as Level) || 'debug')
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
