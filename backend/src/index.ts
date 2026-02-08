import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import eventsRoutes from './routes/events'
import migrationRoutes from './routes/migration'
import adminRoutes from './routes/admin'
import feedbackRoutes from './routes/feedback'
import pool from './db'
import client from 'prom-client'
import requestId from './middleware/requestId'
import logger from './logger'
import { runMigrations } from './migrate'
import { generalLimiter } from './middleware/rateLimit'

dotenv.config()

if (!process.env.JWT_SECRET) {
  logger.error('config', 'JWT_SECRET is required. Refusing to start without it.')
  process.exit(1)
}

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
const rawOrigins = process.env.CORS_ORIGIN
const allowedOrigins = rawOrigins
  ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : (process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : [])

if (!rawOrigins && allowedOrigins.length > 0) {
  logger.warn('cors', 'CORS_ORIGIN not set; using localhost defaults for development.')
}

if (allowedOrigins.length === 0) {
  // Same-origin only; no CORS headers are emitted.
  app.use(cors({ origin: false }))
} else {
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error('CORS blocked'), false)
    },
    credentials: true,
  }))
}
app.use(cookieParser())
app.use(express.json({ limit: '5mb' }))
app.use(generalLimiter)

// attach request id early so handlers can include it in logs
app.use(requestId)
// Request logging: method, path, status, duration, requestId
// Prometheus metrics
try {
  client.collectDefaultMetrics({ prefix: 'table_manager_' })
} catch (e) {
  logger.warn('metrics', 'prom-client collectDefaultMetrics failed', e)
}
const httpReqCounter = new client.Counter({ name: 'table_manager_http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'route', 'code'] })
const httpReqDuration = new client.Histogram({ name: 'table_manager_http_request_duration_seconds', help: 'HTTP request duration seconds', labelNames: ['method', 'route', 'code'], buckets: [0.005,0.01,0.05,0.1,0.3,0.5,1,2,5] })

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const durSec = (Date.now() - start) / 1000
    try {
      const route = (req.route && req.route.path) || req.path || req.originalUrl || req.url
      httpReqCounter.inc({ method: req.method, route: String(route), code: String(res.statusCode) }, 1)
      httpReqDuration.observe({ method: req.method, route: String(route), code: String(res.statusCode) }, durSec)
      logger.info('http', { method: req.method, path: req.originalUrl || req.url, status: res.statusCode, durationMs: Date.now() - start, requestId: (req as any).requestId })
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

// Health endpoint for probes
app.get('/health', async (req, res) => {
  try {
    // lightweight db check
    await pool.query('SELECT 1')
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false, error: (e as any)?.message || String(e) })
  }
})

// Prometheus metrics endpoint
const metricsToken = process.env.METRICS_TOKEN
if (!metricsToken) {
  logger.warn('metrics', 'METRICS_TOKEN not set; /metrics will be disabled.')
}

function requireMetricsToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!metricsToken) return res.status(503).json({ error: 'Metrics disabled' })
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  const token = auth.slice(7)
  if (token !== metricsToken) return res.status(403).json({ error: 'Invalid token' })
  return next()
}

app.get('/metrics', requireMetricsToken, async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType)
    res.send(await client.register.metrics())
  } catch (e) {
    res.status(500).send((e as any)?.message || String(e))
  }
})

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
