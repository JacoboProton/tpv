import { NextRequest, NextResponse } from 'next/server';
import { validateTenantOwnership } from '@/lib/rbac';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
const DEV_FALLBACKS = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length === 0) return false;
  if (ALLOWED_ORIGINS.includes('*')) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (DEV_FALLBACKS.includes(origin)) return true;
  return false;
}

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tpv-key, x-tenant-id, x-employee-id, x-employee-role, x-device-id',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function errorResponse(req: NextRequest, status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: corsHeaders(req) });
}

function corsNext(req: NextRequest) {
  const res = NextResponse.next();
  const h = corsHeaders(req);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}

const ADMIN_PATHS = [
  '/api/settings', '/api/catalog', '/api/modifiers',
  '/api/combos', '/api/meal-menus', '/api/offers', '/api/price-rules',
  '/api/buffet', '/api/invoice', '/api/backup', '/api/migrate',
  '/api/reset-orders', '/api/seed-products', '/api/tenants',
  '/api/verifactu', '/api/albaranes', '/api/purchase-orders',
  '/api/suppliers', '/api/supplier-catalog', '/api/supplier-price-history',
  '/api/auto-order-settings', '/api/recipes', '/api/production',
  '/api/add-stock', '/api/move-stock', '/api/split-stock',
  '/api/stock-log', '/api/gestoria', '/api/kds/audit',
  '/api/delivery-zones', '/api/delivery/runners', '/api/access-logs',
  '/api/clockin-corrections', '/api/closures', '/api/debug',
  '/api/catalog/csv',
];

const PUBLIC_PATHS = [
  '/api/webhooks/', '/api/pedir/', '/api/reservar/', '/api/waitlist/',
  '/api/qr/', '/api/qr-order', '/api/qr-calls', '/api/kds', '/api/kds/audit',
  '/api/stripe/webhook',
];

const ROLE_ROUTES = [
  { path: '/api/floor', methods: ['GET', 'PATCH'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/sales', methods: ['POST'], roles: ['admin', 'camarero'] },
  // POST /api/employees NO requiere rol preestablecido (verify/generate-codes/link-whatsapp se autentican con API key + PIN)
  { path: '/api/session', methods: ['POST'], roles: ['admin', 'camarero', 'cocina'] },
  { path: '/api/keep-alive', methods: ['GET'], roles: ['admin', 'camarero', 'cocina'] },
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(p => pathname.startsWith(p));
}

function getMatchingRoute(pathname: string, method: string) {
  return ROLE_ROUTES.find(r => pathname.startsWith(r.path) && r.methods.includes(method));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
  }

  if (isPublicPath(pathname)) return corsNext(req);

  const key = req.headers.get('x-tpv-key');
  const expected = process.env.TPV_API_KEY;
  if (expected && key !== expected) {
    return errorResponse(req, 401, { error: 'No autorizado' });
  }

  const role = req.headers.get('x-employee-role');
  const employeeId = req.headers.get('x-employee-id');
  const tenantId = req.headers.get('x-tenant-id') || 'default';

  // Permitir peticiones con API key válida para carga inicial (antes del login)
  // excepto rutas de administrador que siempre requieren rol admin
  const hasApiKey = !!(expected && key === expected && key);
  if (hasApiKey && !isAdminPath(pathname) && !getMatchingRoute(pathname, req.method)) {
    return corsNext(req);
  }

  if (isAdminPath(pathname)) {
    if (!employeeId || !role || role !== 'admin') {
      return errorResponse(req, 403, { error: 'Solo administradores' });
    }
    if (!(await validateTenantOwnership(employeeId, tenantId))) {
      return errorResponse(req, 403, { error: 'Empleado no pertenece a este tenant' });
    }
    return corsNext(req);
  }

  const route = getMatchingRoute(pathname, req.method);
  if (route) {
    if (!employeeId || !role || !route.roles.includes(role)) {
      return errorResponse(req, 403, { error: 'No tienes permisos para esta operación' });
    }
    if (!(await validateTenantOwnership(employeeId, tenantId))) {
      return errorResponse(req, 403, { error: 'Empleado no pertenece a este tenant' });
    }
    return corsNext(req);
  }

  if (!employeeId || !role) {
    return errorResponse(req, 401, { error: 'Autenticación requerida' });
  }

  if (!(await validateTenantOwnership(employeeId, tenantId))) {
    return errorResponse(req, 403, { error: 'Empleado no pertenece a este tenant' });
  }

  return corsNext(req);
}

export const config = {
  matcher: '/api/:path*',
};
