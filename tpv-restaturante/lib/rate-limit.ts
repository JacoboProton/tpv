const attempts = new Map<string, { count: number; resetAt: number }>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of attempts) {
      if (now > entry.resetAt) attempts.delete(key)
    }
  }, 300_000)
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs }
  }

  entry.count++

  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: entry.resetAt }
}

export function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; remaining: number; reset: number } {
  const result = checkRateLimit(key, maxAttempts, windowMs)
  return { allowed: result.allowed, remaining: result.remaining, reset: result.resetAt }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return '127.0.0.1'
}
