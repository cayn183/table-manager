import express from 'express'

declare global {
  namespace Express {
    interface Request {
      /** Unique request id (generated or forwarded from client) */
      requestId?: string
      /**
       * Helper to log with requestId automatically attached.
       * Usage: `req.log('info', 'auth', { action: 'login' })`
       */
      log?: (level: 'debug' | 'info' | 'warn' | 'error', tag?: string | undefined, payload?: any) => void
    }
  }
}

export {}
