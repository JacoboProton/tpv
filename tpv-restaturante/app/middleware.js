import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const key = req.headers.get('x-tpv-key');
  const expected = process.env.TPV_API_KEY;
  if (expected && key !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
