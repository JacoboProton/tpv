import { NextRequest } from 'next/server';

interface ReqOpts {
  headers?: Record<string, unknown>;
  method?: string;
  body?: unknown;
}

export function req(url = 'http://localhost', opts: ReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.headers || {})) headers[k] = String(v);
  if (!headers['content-type']) headers['content-type'] = 'application/json';
  if (!headers['x-tenant-id']) headers['x-tenant-id'] = 'default';
  return new NextRequest(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}
