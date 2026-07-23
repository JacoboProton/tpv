import { NextRequest, NextResponse } from 'next/server';

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

const PUBLIC_PATHS = [
  '/api/webhooks/', '/api/pedir/', '/api/reservar/', '/api/waitlist/',
  '/api/qr/', '/api/qr-order', '/api/qr-calls', '/api/kds', '/api/kds/audit',
  '/api/stripe/webhook',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
  }

  if (isPublicPath(pathname)) return corsNext(req);

  const key = req.headers.get('x-tpv-key');
  const expected = process.env.TPV_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // En producción, TPV_API_KEY es obligatorio
    if (!expected) {
      return errorResponse(req, 500, { error: 'Error de configuración: TPV_API_KEY no definida' });
    }
    if (key !== expected) {
      return errorResponse(req, 401, { error: 'No autorizado' });
    }
  } else {
    // En desarrollo, permitir si TPV_API_KEY está configurada
    if (expected && key !== expected) {
      return errorResponse(req, 401, { error: 'No autorizado' });
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
  // TODAS las rutas protegidas deben invocar requireRole() al inicio del handler.

  return corsNext(req);
}

export const config = {
  matcher: '/api/:path*',
};
