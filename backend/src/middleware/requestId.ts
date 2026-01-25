import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import logger from '../logger'

export default function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // prefer incoming header, otherwise generate
  const incoming = (req.headers['x-request-id'] as string) || undefined
  const id = incoming || uuidv4()
  ;(req as any).requestId = id
  res.setHeader('X-Request-Id', id)

  // attach a small helper to log with requestId automatically
  ;(req as any).log = (level: 'debug' | 'info' | 'warn' | 'error', tag: string | undefined, payload?: any) => {
    try {
      const body = payload && typeof payload === 'object' ? { requestId: id, ...payload } : { requestId: id, msg: payload }
      if (level === 'debug') logger.debug(tag, body)
      else if (level === 'info') logger.info(tag, body)
      else if (level === 'warn') logger.warn(tag, body)
      else logger.error(tag, body)
    } catch (e) {
      // fallback to console if logger fails
      // eslint-disable-next-line no-console
      console.error('req.log failure', e)
    }
  }

  // If Sentry is available, capture errors automatically as well
  if ((global as any).__SENTRY || (global as any).Sentry) {
    const Sentry = (global as any).__SENTRY || (global as any).Sentry
    const oldLog = (req as any).log
    ;(req as any).log = (level: 'debug' | 'info' | 'warn' | 'error', tag: string | undefined, payload?: any) => {
      oldLog(level, tag, payload)
      try {
        if (level === 'error') {
          const err = payload && payload.err ? payload.err : payload
          if (err instanceof Error) {
            Sentry.withScope((scope: any) => {
              scope.setTag('requestId', id)
              if (payload && payload.user) scope.setUser({ id: payload.user })
              if (tag) scope.setTag('logTag', tag)
              Sentry.captureException(err)
            })
          } else {
            Sentry.captureMessage(typeof payload === 'string' ? payload : JSON.stringify(payload))
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  next()
}
