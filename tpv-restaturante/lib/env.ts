function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Falta variable de entorno: ${name}`)
  return val
}

export function validateEnv(): void {
  if (process.env.NODE_ENV !== 'production') return
  requireEnv('DATABASE_URL')
  requireEnv('TPV_API_KEY')
  requireEnv('NEXT_PUBLIC_TPV_API_KEY')
  requireEnv('CRON_SECRET')
}
