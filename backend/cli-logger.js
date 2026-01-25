// Lightweight CLI logger for backend helper scripts (CommonJS)
const LEVELS = ['debug', 'info', 'warn', 'error']
const ENV_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase()

function time() { return new Date().toISOString() }

function format(level, tag, msg) {
  const prefix = `[${time()}]${tag ? ' [' + tag + ']' : ''} ${level.toUpperCase()}: `
  if (typeof msg === 'string') return prefix + msg
  try { return prefix + JSON.stringify(msg) } catch { return prefix + String(msg) }
}

function shouldLog(level) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(ENV_LEVEL)
}

module.exports = {
  debug: (tag, ...args) => { if (!shouldLog('debug')) return; console.debug(format('debug', tag, args.length > 1 ? args : args[0])) },
  info: (tag, ...args) => { if (!shouldLog('info')) return; console.log(format('info', tag, args.length > 1 ? args : args[0])) },
  warn: (tag, ...args) => { if (!shouldLog('warn')) return; console.warn(format('warn', tag, args.length > 1 ? args : args[0])) },
  error: (tag, ...args) => { if (!shouldLog('error')) return; console.error(format('error', tag, args.length > 1 ? args : args[0])) },
}
