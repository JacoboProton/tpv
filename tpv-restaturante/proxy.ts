import { NextRequest, NextResponse } from 'next/server';
import { validateEnv } from './lib/env';
import { rateLimit, getClientIp } from './lib/rate-limit';
import { extractToken, verifySessionToken, type SessionClaimsVerified } from './lib/auth/jwt';
import { verifyApiKey } from './lib/auth/api-keys';

let envValidated = false;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
const DEV_FALLBACKS = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length === 0) return false;
  const isProduction = process.env.NODE_ENV === 'production';
  if (ALLOWED_ORIGINS.includes('*')) return !isProduction;
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
  return propogateCorrelationId(req, NextResponse.json(body, { status, headers: corsHeaders(req) }));
}

function corsNext(req: NextRequest, requestHeaders?: Headers) {
  const res = NextResponse.next(requestHeaders ? { request: { headers: requestHeaders } } : undefined);
  const h = corsHeaders(req);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return propogateCorrelationId(req, res, requestHeaders);
}

function propogateCorrelationId(req: NextRequest, res: NextResponse, requestHeaders?: Headers) {
  const id = req.headers.get('x-correlation-id') ?? crypto.randomUUID();
  if (requestHeaders) requestHeaders.set('x-correlation-id', id);
  res.headers.set('x-correlation-id', id);
  return res;
}

const PUBLIC_PATHS = [
  '/api/health',
  '/api/webhooks/', '/api/pedir/', '/api/reservar/', '/api/waitlist/',
  '/api/qr/', '/api/qr-order', '/api/qr-calls', '/api/kds', '/api/kds/audit',
  '/api/fichar/',
  '/api/stripe/webhook',
  '/api/reservations/availability',
  '/api/delivery/tracking',
  '/api/backup-cron',
  '/api/demo-seed',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

interface AuthResult {
  type: 'jwt' | 'apikey';
  tenantId: string;
  claims?: SessionClaimsVerified;
}

/**
 * Proporciona la identidad de forma NO spoofeable:
 *  - JWT válido -> claims verificados que SOBRESCRIBEN cualquier header de identidad fabricado.
 *  - API key    -> identidad de cliente (pos/kds/mobile) únicamente; sin empleado => no escala roles.
 * `unauthorized` indica que el cliente presentó credenciales (Bearer) inválidas o en conflicto
 * (deviceId distinto): el proxy debe responder 401 en lugar de reenviar sin identidad.
 */
async function resolveAuth(req: NextRequest): Promise<{ auth: AuthResult | null; requestHeaders: Headers; unauthorized: boolean }> {
  const requestHeaders = new Headers(req.headers);

  const stripIdentity = (h: Headers) => {
    h.delete('x-employee-id');
    h.delete('x-employee-role');
    h.delete('x-device-id');
  };

  // 1) JWT (cookie HttpOnly o Bearer)
  const token = extractToken(req);
  if (token) {
    const claims = await verifySessionToken(token);
    if (claims) {
      const reqDevice = requestHeaders.get('x-device-id');
      if (reqDevice && claims.deviceId && reqDevice !== claims.deviceId) {
        const clean = new Headers(requestHeaders);
        stripIdentity(clean);
        return { auth: null, requestHeaders: clean, unauthorized: true };
      }
      const forwarded = new Headers(requestHeaders);
      forwarded.set('x-employee-id', claims.sub);
      forwarded.set('x-employee-role', claims.role);
      forwarded.set('x-tenant-id', claims.tenantId);
      if (claims.deviceId) forwarded.set('x-device-id', claims.deviceId);
      return { auth: { type: 'jwt', tenantId: claims.tenantId, claims }, requestHeaders: forwarded, unauthorized: false };
    }
    // JWT presente pero inválido/expirado: rechazar identidad fabricada.
    // Si el token llegó por cabecera Authorization (cliente explícito), responder 401;
    // una cookie obsoleta se deja pasar para que la ruta la invalide con gracia.
    const clean = new Headers(requestHeaders);
    stripIdentity(clean);
    return { auth: null, requestHeaders: clean, unauthorized: Boolean(req.headers.get('authorization')) };
  }

  // 2) API key de cliente (rotable por cliente)
  const forwarded = new Headers(requestHeaders);
  stripIdentity(forwarded);

  const key = req.headers.get('x-tpv-key');
  if (key) {
    const tenant = requestHeaders.get('x-tenant-id') || 'default';
    const row = await verifyApiKey(key, tenant);
    if (row) {
      forwarded.set('x-client-type', row.clientType);
      return { auth: { type: 'apikey', tenantId: tenant }, requestHeaders: forwarded, unauthorized: false };
    }
    return { auth: null, requestHeaders: forwarded, unauthorized: false };
  }

  // Sin identidad válida: drop del tenant declarado por el cliente.
  // Un anónimo no puede elegir el tenant operando; las rutas públicas
  // de escritura validan contra ALLOWED_PUBLIC_TENANTS por separado.
  forwarded.delete('x-tenant-id');

  return { auth: null, requestHeaders: forwarded, unauthorized: false };
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === 'OPTIONS') {
    return propogateCorrelationId(req, new NextResponse(null, { status: 204, headers: corsHeaders(req) }));
  }

  if (isPublicPath(pathname)) return corsNext(req);

  if (!envValidated) {
    validateEnv();
    envValidated = true;
  }

  const ip = getClientIp(req);
  const rl = await rateLimit(`mw:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return errorResponse(req, 429, { error: 'Demasiadas solicitudes' });
  }

  const { requestHeaders, unauthorized } = await resolveAuth(req);
  if (unauthorized) {
    return errorResponse(req, 401, { error: 'Sesión no válida' });
  }
  return corsNext(req, requestHeaders);
}

export const config = {
  matcher: '/api/:path*',
};