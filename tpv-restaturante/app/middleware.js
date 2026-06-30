import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 });
  }

  if (pathname.startsWith('/api/webhooks/')) return NextResponse.next();

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
