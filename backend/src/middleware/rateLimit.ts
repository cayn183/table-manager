import rateLimit from 'express-rate-limit'

type LimiterOpts = {
  windowMs: number
  max: number
  message: { error: string }
}

function createLimiter(opts: LimiterOpts) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: opts.message,
  })
}

export const generalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Zu viele Anfragen. Bitte spaeter erneut versuchen.' },
})

export const loginLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Zu viele Login-Versuche. Bitte spaeter erneut versuchen.' },
})

export const registerLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Zu viele Registrierungen. Bitte spaeter erneut versuchen.' },
})

export const checkEmailLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Anfragen. Bitte spaeter erneut versuchen.' },
})

export const feedbackLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Zu viele Feedback-Anfragen. Bitte spaeter erneut versuchen.' },
})
