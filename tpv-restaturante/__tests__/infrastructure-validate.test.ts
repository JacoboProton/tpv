import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseBody } from '../lib/infrastructure/validate';

const schema = z.object({ name: z.string(), qty: z.number() });

describe('lib/infrastructure/validate parseBody', () => {
  function reqWithJson(body: unknown): NextRequest {
    const req = new NextRequest('http://localhost/api/x', { method: 'POST' });
    req.json = () => Promise.resolve(body);
    return req;
  }

  it('parses and validates a valid body', async () => {
    const req = reqWithJson({ name: 'mesa', qty: 4 });
    const out = await parseBody(req, schema);
    expect(out).toEqual({ name: 'mesa', qty: 4 });
  });

  it('throws a JSON-stringified error for schema violations', async () => {
    const req = reqWithJson({ name: 42 });
    await expect(parseBody(req, schema)).rejects.toThrow('"code"');
  });

  it('throws Invalid JSON body for a SyntaxError', async () => {
    const req = new NextRequest('http://localhost/api/x', { method: 'POST' });
    req.json = () => Promise.reject(new SyntaxError('Unexpected token'));
    await expect(parseBody(req, schema)).rejects.toThrow('Invalid JSON body');
  });

  it('rethrows non-validation errors', async () => {
    const req = new NextRequest('http://localhost/api/x', { method: 'POST' });
    const boom = new Error('nope');
    req.json = () => Promise.reject(boom);
    await expect(parseBody(req, schema)).rejects.toThrow('nope');
  });
});