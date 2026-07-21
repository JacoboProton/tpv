import { NextResponse } from 'next/server';

export function apiOk(data?: unknown) {
  return NextResponse.json(data ?? { ok: true });
}

export function apiCreated(data?: unknown) {
  return NextResponse.json(data ?? { ok: true }, { status: 201 });
}

export function apiError(err: unknown, status = 500) {
  const msg = (err as Error).message;
  const cause = (err as Error).cause;
  return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status });
}

export function apiBadRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function apiUnauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function apiForbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function apiNotFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function apiTooManyRequests(message = 'Too many requests') {
  return NextResponse.json({ error: message }, { status: 429 });
}

export function apiServerError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 503 });
}
