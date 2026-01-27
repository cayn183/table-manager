import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import eventsRoutes from './routes/events'
import migrationRoutes from './routes/migration'
import adminRoutes from './routes/admin'
import feedbackRoutes from './routes/feedback'
import requestId from './middleware/requestId'
import logger from './logger'
import { runMigrations } from './migrate'

dotenv.config()

const app = express()

// Optional Sentry integration (only initialised when SENTRY_DSN is set)
if (process.env.SENTRY_DSN) {
  try {
    // require dynamically so package is optional
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node')
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0 })
    // attach Sentry request handler early
    app.use(Sentry.Handlers.requestHandler())
    app.use(Sentry.Handlers.tracingHandler && Sentry.Handlers.tracingHandler())
    // attach to global logger on error capture (optional)
    logger.info('sentry', 'Sentry initialized')
    // expose Sentry on app for later use (error handler)
    ;(app as any).__sentry = Sentry
  } catch (e) {
    logger.warn('sentry', 'Failed to initialize Sentry', e)
  }
}
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// attach request id early so handlers can include it in logs
app.use(requestId)
// Request logging: method, path, status, duration, requestId
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const dur = Date.now() - start
    try {
      logger.info('http', { method: req.method, path: req.originalUrl || req.url, status: res.statusCode, durationMs: dur, requestId: (req as any).requestId })
    } catch (e) {
      // swallow logging errors
    }
  })
  next()
})
app.use('/auth', authRoutes)
app.use('/events', eventsRoutes)
app.use('/migration', migrationRoutes)
app.use('/admin', adminRoutes)
app.use('/feedback', feedbackRoutes)

app.get('/', (req, res) => res.json({ ok: true, version: '0.1.0' }))

// Use a fixed backend port to reduce required environment variables.
// The API listens on port 4000 inside the container.
const port = 4000

async function start() {
  if (process.env.MIGRATE_ON_START === 'true') {
    try {
      logger.info('migrate', 'Running migrations on start')
      await runMigrations()
      logger.info('migrate', 'Migrations applied')
    } catch (e) {
      logger.error('migrate', 'Migration failed', e)
      process.exit(1)
    }
  }

  app.listen(port, () => logger.info('server', `Server listening on ${port}`))
}

start()

// If Sentry was initialized, use its error handler after routes
if ((app as any).__sentry) {
	const Sentry = (app as any).__sentry
	// Sentry error handler (must be before any other error handlers)
	app.use(Sentry.Handlers.errorHandler())
}

// Global error handler (logs error details and returns sanitized message)
app.use((err: any, req: any, res: any, next: any) => {
  try {
    logger.error('error', { message: err && err.message, stack: err && err.stack, requestId: req && req.requestId })
  } catch (e) {
    // ignore logging problems
  }
  if (res.headersSent) return next(err)
  res.status(err && err.status ? err.status : 500).json({ error: 'Internal server error' })
})
