# Configuración de Variables de Entorno

Este proyecto usa variables de entorno para gestionar credenciales y configuración sensible.

## Desarrollo Local

1. Crea un archivo `.env` en la raíz del proyecto:
```bash
cp .env.example .env
```

2. Edita `.env` con tus credenciales reales:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
EXPO_PUBLIC_TPV_API_KEY=tu_clave_api
EXPO_PUBLIC_SUPABASE_URL=tu_url_supabase
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_clave_supabase
EXPO_PUBLIC_STRIPE_PK=tu_clave_stripe_publica
EXPO_PUBLIC_STRIPE_SIMULATED=false
```

3. Inicia el proyecto:
```bash
npm start
```

## Producción con EAS Build

Para builds de producción con Expo Application Services (EAS), usa EAS Secrets:

```bash
# Configurar secrets para EAS
eas secret:push EXPO_PUBLIC_API_URL --value "https://tu-produccion-url.com"
eas secret:push EXPO_PUBLIC_TPV_API_KEY --value "tu_clave_api_segura"
eas secret:push EXPO_PUBLIC_SUPABASE_URL --value "tu_url_supabase"
eas secret:push EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "tu_clave_supabase"
eas secret:push EXPO_PUBLIC_STRIPE_PK --value "tu_clave_stripe_publica"
eas secret:push EXPO_PUBLIC_STRIPE_SIMULATED --value "false"
```

## CI/CD

Para integración continua, configura las variables en tu plataforma CI:

### GitHub Actions
```yaml
env:
  EXPO_PUBLIC_API_URL: ${{ secrets.EXPO_PUBLIC_API_URL }}
  EXPO_PUBLIC_TPV_API_KEY: ${{ secrets.EXPO_PUBLIC_TPV_API_KEY }}
  EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
  EXPO_PUBLIC_STRIPE_PK: ${{ secrets.EXPO_PUBLIC_STRIPE_PK }}
  EXPO_PUBLIC_STRIPE_SIMULATED: false
```

## Prioridad de Configuración

El código busca variables en este orden:
1. Variables de entorno (`EXPO_PUBLIC_*`)
2. `app.json` → `extra` (para backward compatibility)
3. Valores por defecto

## Seguridad

- **Nunca** comprometas el archivo `.env` al repositorio
- **Nunca** uses credenciales reales en `app.json`
- **Nunca** expongas claves privadas (solo públicas)
- Usa EAS Secrets o CI/CD secrets para producción
- Rota las credenciales periódicamente

## Variables Disponibles

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | URL del servidor Next.js | `https://tpv-restaurante.onrender.com` |
| `EXPO_PUBLIC_TPV_API_KEY` | Clave API para autenticación | `tu_clave_secreta` |
| `EXPO_PUBLIC_SUPABASE_URL` | URL de proyecto Supabase | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública Supabase | `sb_publishable_xxx` |
| `EXPO_PUBLIC_STRIPE_PK` | Clave pública Stripe | `pk_test_xxx` |
| `EXPO_PUBLIC_STRIPE_SIMULATED` | Simular pagos Stripe | `true`/`false` |
