function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Falta variable de entorno: ${name}`)
  return val
}

export function validateEnv(): void {
  if (process.env.NODE_ENV !== 'production') return
  requireEnv('DATABASE_URL')
  // Para firmar/verificar JWT: o bien un secreto HS256, o bien claves RS256 (private + public)
  if (!process.env.JWT_SECRET && !process.env.JWT_PRIVATE_KEY) {
    throw new Error('Falta variable de entorno: JWT_SECRET (o JWT_PRIVATE_KEY + JWT_PUBLIC_KEY)')
  }
  if (process.env.JWT_PRIVATE_KEY && !process.env.JWT_PUBLIC_KEY) {
    throw new Error('Falta variable de entorno: JWT_PUBLIC_KEY (requerida junto a JWT_PRIVATE_KEY)')
  }
  requireEnv('CRON_SECRET')
}