import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_KEY = process.env.TPV_API_KEY

const PUBLIC_PATHS = [
  '/api/webhooks',
  '/api/kds',
  '/api/stripe/webhook',
  '/api/qr',
  '/api/qr-order',
  '/api/qr-calls',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

function errorResponse(req: NextRequest, status: number, body: unknown): NextResponse {
  const origin = req.headers.get('origin') || '*'
  return NextResponse.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tpv-key, x-employee-id, x-employee-role, x-device-id, x-tenant-id',
    },
  })
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // CORS preflight
  if (method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '*'
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-tpv-key, x-employee-id, x-employee-role, x-device-id, x-tenant-id',
      },
    })
  }

  // Solo proteger rutas /api
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Rutas públicas
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // Validar API key
  const key = req.headers.get('x-tpv-key')
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    // En producción, TPV_API_KEY es obligatorio
    if (!API_KEY) {
      return errorResponse(req, 500, { error: 'Error de configuración: TPV_API_KEY no definida' })
    }
    if (key !== API_KEY) {
      return errorResponse(req, 401, { error: 'No autorizado' })
    }
  } else {
    // En desarrollo, permitir si TPV_API_KEY está configurada
    if (API_KEY && key !== API_KEY) {
      return errorResponse(req, 401, { error: 'No autorizado' })
    }
  }

  // NOTA DE SEGURIDAD: La validación de sesión y roles NO se hace aquí en el middleware porque:
  // 1. Next.js middleware corre en Edge runtime
  // 2. lib/rbac.ts usa getDb() (node-postgres) que no funciona en Edge
  // 3. Confiar en headers (x-employee-role, x-employee-id) sin validar contra BD es inseguro
  // 
  // Por tanto, este middleware solo actúa como primera barrera (API key + CORS).
  // La validación real de sesión y roles se hace en cada route handler usando:
  // - getSessionEmployee() para obtener la sesión validada contra BD
  // - requireRole([...]) para verificar permisos específicos
  //
  // TODAS las rutas en ADMIN_PATHS y ROLE_ROUTES deben invocar requireRole() al inicio.

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
