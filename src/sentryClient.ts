// Lightweight wrapper to initialise Sentry in the frontend only when configured.
type SentryType = any
let Sentry: SentryType | null = null
let initialized = false

export async function initSentry() {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN
  if (!dsn || initialized) return
  try {
    const SentryMod = await import('@sentry/react')
    const Tracing = await import('@sentry/tracing')
    Sentry = SentryMod
    Sentry.init({
      dsn,
      integrations: [new Tracing.BrowserTracing()],
      tracesSampleRate: Number((import.meta as any).env?.VITE_SENTRY_TRACES_SAMPLE_RATE || 0)
    })
    initialized = true
    console.info('Sentry initialized')
  } catch (e) {
    // package not installed or init failed — ignore silently
    // eslint-disable-next-line no-console
    console.warn('Sentry not available', e)
  }
}

export function captureException(err: any, ctx?: any) {
  if (!Sentry) return
  try {
    if (ctx && ctx.requestId) Sentry.setTag('requestId', ctx.requestId)
    if (ctx && ctx.user) Sentry.setUser({ id: ctx.user })
    Sentry.captureException(err)
  } catch (e) {
    // ignore
  }
}

export function addBreadcrumb(b: any) {
  if (!Sentry) return
  try { Sentry.addBreadcrumb(b) } catch (e) {}
}

export function setUser(user: { id: string } | null) {
  if (!Sentry) return
  try { Sentry.setUser(user) } catch (e) {}
}

export function clearUser() {
  if (!Sentry) return
  try { Sentry.setUser(null) } catch (e) {}
}

export default { initSentry, captureException, addBreadcrumb, setUser, clearUser }
