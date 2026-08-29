import { Redis } from '@upstash/redis';

interface RedisClient {
  incr: (k: string) => Promise<number>;
  expire: (k: string, s: number) => Promise<number>;
  ttl: (k: string) => Promise<number>;
}

let redis: RedisClient | null = null;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisDirectUrl = process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === 'production';

if (redisUrl && redisToken) {
  try {
    const r = new Redis({ url: redisUrl, token: redisToken });
    redis = {
      incr: (k) => r.incr(k),
      expire: (k, s) => r.expire(k, s),
      ttl: (k) => r.ttl(k),
    };
  } catch {
    redis = null;
  }
} else if (redisDirectUrl) {
  try {
    const r = new Redis({ url: redisDirectUrl, token: redisToken || undefined });
    redis = {
      incr: (k) => r.incr(k),
      expire: (k, s) => r.expire(k, s),
      ttl: (k) => r.ttl(k),
    };
  } catch {
    redis = null;
  }
}

const memStore = new Map<string, { count: number; resetAt: number }>();
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore) {
      if (now > entry.resetAt) memStore.delete(key);
    }
  }, 300_000);
}

let warnedMemFallback = false;
function warnMemFallback(): void {
  if (warnedMemFallback) return;
  warnedMemFallback = true;
  console.warn(
    '[rate-limit] Upstash Redis no configurado: usando rate limit en memoria. ' +
    'No es seguro multi-proceso; configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.'
  );
}

async function memLimit(key: string, max: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, reset: now + windowMs };
  }
  entry.count++;
  if (entry.count > max) {
    return { allowed: false, remaining: 0, reset: entry.resetAt };
  }
  return { allowed: true, remaining: max - entry.count, reset: entry.resetAt };
}

async function redisLimit(key: string, max: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  if (!redis) {
    if (isProduction) warnMemFallback();
    return memLimit(key, max, windowMs);
  }
  const windowSeconds = Math.ceil(windowMs / 1000);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  const ttl = await redis.ttl(key);
  const reset = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + windowMs;
  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    reset,
  };
}

export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  return redisLimit(key, max, windowMs);
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const result = await rateLimit(key, maxAttempts, windowMs);
  return { allowed: result.allowed, remaining: result.remaining, resetAt: result.reset };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}
