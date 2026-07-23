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

const ADMIN_PATHS = [
  '/api/settings', '/api/catalog', '/api/modifiers',
  '/api/combos', '/api/meal-menus', '/api/offers', '/api/price-rules',
  '/api/buffet', '/api/invoice', '/api/backup', '/api/migrate',
  '/api/reset-orders', '/api/seed-products', '/api/tenants',
  '/api/verifactu', '/api/albaranes', '/api/purchase-orders',
  '/api/suppliers', '/api/supplier-catalog', '/api/supplier-price-history',
  '/api/auto-order-settings', '/api/recipes', '/api/production',
  '/api/add-stock', '/api/move-stock', '/api/split-stock', '/api/stock-log',
  '/api/gestoria', '/api/delivery-zones', '/api/delivery/runners',
  '/api/access-logs', '/api/clockin-corrections', '/api/closures',
  '/api/debug', '/api/catalog/csv',
]

const ROLE_ROUTES: Array<{ path: string; methods: string[]; roles: string[] }> = [
  { path: '/api/floor', methods: ['GET', 'PATCH'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/sales', methods: ['POST'], roles: ['admin', 'camarero'] },
  { path: '/api/employees', methods: ['POST'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/session', methods: ['POST'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/keep-alive', methods: ['GET'], roles: ['admin', 'camarero', 'cocina'] },
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PATHS.some(p => pathname.startsWith(p))
}

function getRouteRoles(pathname: string, method: string): string[] | null {
  for (const r of ROLE_ROUTES) {
    if (pathname.startsWith(r.path) && r.methods.includes(method)) {
      return r.roles
    }
  }
  return null
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
  if (API_KEY && key !== API_KEY) {
    return errorResponse(req, 401, { error: 'No autorizado' })
  }

  // Validar sesión contra BD
  const employeeId = req.headers.get('x-employee-id')
  const deviceId = req.headers.get('x-device-id')
  const headerRole = req.headers.get('x-employee-role')

  if (employeeId && deviceId && API_KEY) {
    try {
      const { getSessionEmployee } = await import('@/lib/rbac')
      const session = await getSessionEmployee(req)

      if (!session) {
        return errorResponse(req, 401, { error: 'Sesión no válida o expirada' })
      }

      // Si el rol del header no coincide con BD, rechazar
      if (headerRole && headerRole !== session.role) {
        return errorResponse(req, 403, { error: 'Rol no válido' })
      }

      // Verificar permisos de ruta
      const routeRoles = getRouteRoles(pathname, method)
      if (routeRoles && !routeRoles.includes(session.role)) {
        return errorResponse(req, 403, { error: 'No tienes permisos para esta operación' })
      }

      if (isAdminRoute(pathname) && session.role !== 'admin') {
        return errorResponse(req, 403, { error: 'Se requiere rol de administrador' })
      }
    } catch {
      // Si falla la validación (ej: DB no disponible), denegar
      return errorResponse(req, 500, { error: 'Error al validar sesión' })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
