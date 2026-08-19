import * as Sentry from '@sentry/nextjs'

export function setSentryUser(opts: { tenantId?: string; employeeName?: string }) {
  if (opts.tenantId) {
    Sentry.setTag('tenantId', opts.tenantId)
  }
  if (opts.employeeName) {
    Sentry.setUser({ username: opts.employeeName })
  }
}