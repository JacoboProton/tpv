import { NextResponse } from 'next/server';

export function apiOk(data?: unknown) {
  return NextResponse.json(data ?? { ok: true });
}

export function apiError(err: unknown, status = 500) {
  const msg = (err as Error).message;
  const cause = (err as Error).cause;
  return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status });
}

export function apiBadRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function apiNotFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}
