import { NextResponse } from 'next/server';

function addCors(res, origin) {
  if (origin) res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tpv-key, x-tenant-id');
  res.headers.set('Access-Control-Max-Age', '86400');
  return res;
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tpv-key, x-tenant-id',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (pathname.startsWith('/api/webhooks/')) return addCors(NextResponse.next(), origin);

  const key = req.headers.get('x-tpv-key');
  const expected = process.env.TPV_API_KEY;
  if (expected && key !== expected) {
    return addCors(NextResponse.json({ error: 'No autorizado' }, { status: 401 }), origin);
  }

  return addCors(NextResponse.next(), origin);
}

export const config = {
  matcher: '/api/:path*',
};
