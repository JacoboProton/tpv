import { SignJWT, jwtVerify } from 'jose';
import { importPKCS8, importSPKI } from 'jose';
import type { JWTPayload, KeyObject } from 'jose';

export const JWT_COOKIE = 'tpv_session';
export const JWT_ISSUER = 'tpv-restaurante';
export const JWT_AUDIENCE = 'tpv-clients';

export interface SessionClaims {
  sub: string;      // employeeId
  role: string;
  tenantId: string;
  deviceId: string;
}

export interface SessionClaimsVerified extends SessionClaims {
  iat: number;
  exp: number;
}

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_TICKET_TTL_MS = 3 * 60 * 1000;

function getTtlMs(): number {
  const ttl = Number(process.env.JWT_TTL_MS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_MS;
}

// Returns true when RS256 is configured (private key present).
export function isRs256Configured(): boolean {
  return Boolean(process.env.JWT_PRIVATE_KEY);
}

function secretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Falta variable de entorno: JWT_SECRET');
    }
    return new TextEncoder().encode('dev-insecure-secret-change-me');
  }
  return new TextEncoder().encode(secret);
}

async function getSigningKey(): Promise<KeyObject | Uint8Array> {
  if (process.env.JWT_PRIVATE_KEY) {
    return importPKCS8(process.env.JWT_PRIVATE_KEY, 'RS256');
  }
  return secretBytes();
}

async function getVerifyingKey(): Promise<KeyObject | Uint8Array> {
  if (process.env.JWT_PUBLIC_KEY) {
    return importSPKI(process.env.JWT_PUBLIC_KEY, 'RS256');
  }
  if (process.env.JWT_PRIVATE_KEY) {
    return importPKCS8(process.env.JWT_PRIVATE_KEY, 'RS256');
  }
  return secretBytes();
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = new SignJWT({
    role: claims.role,
    tenantId: claims.tenantId,
    deviceId: claims.deviceId,
  })
    .setProtectedHeader({ alg: isRs256Configured() ? 'RS256' : 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(now + Math.floor(getTtlMs() / 1000));

  return jwt.sign(await getSigningKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaimsVerified | null> {
  try {
    const { payload } = await jwtVerify<JWTPayload>(token, await getVerifyingKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return {
      sub: payload.sub,
      role: String(payload.role ?? ''),
      tenantId: String(payload.tenantId ?? 'default'),
      deviceId: String(payload.deviceId ?? ''),
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Login ticket ───────────────────────────────────────────────────────────
// Prueba única y breve que el servidor emite SOLO tras verificar el PIN en
// `/api/employees` (action: verify). El login de sesión la consume y deriva el
// rol de la BD, nunca del ticket ni del cuerpo de la petición.

export async function signLoginTicket(claims: {
  sub: string;
  tenantId: string;
  deviceId?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    tenantId: claims.tenantId,
    deviceId: claims.deviceId ?? '',
  })
    .setProtectedHeader({ alg: isRs256Configured() ? 'RS256' : 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(now + Math.floor(LOGIN_TICKET_TTL_MS / 1000))
    .sign(await getSigningKey());
}

export async function verifyLoginTicket(token: string): Promise<{ sub: string; tenantId: string; deviceId: string; exp: number } | null> {
  try {
    const { payload } = await jwtVerify<JWTPayload>(token, await getVerifyingKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return {
      sub: payload.sub,
      tenantId: String(payload.tenantId ?? 'default'),
      deviceId: String(payload.deviceId ?? ''),
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth && /^Bearer\s+/i.test(auth)) return auth.slice(7).trim();

  const cookie = req.headers.get('cookie');
  if (cookie) {
    const match = cookie.split(';').map(c => c.trim())
      .find(c => c.startsWith(`${JWT_COOKIE}=`));
    if (match) return decodeURIComponent(match.slice(JWT_COOKIE.length + 1));
  }
  return null;
}

export function cookieOptions(): {
  httpOnly: boolean;
  sameSite: 'lax' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: Math.floor(getTtlMs() / 1000),
  };
}
