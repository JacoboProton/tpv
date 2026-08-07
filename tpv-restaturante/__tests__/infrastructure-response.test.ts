import { describe, it, expect } from 'vitest';
import {
  apiOk,
  apiCreated,
  apiError,
  apiBadRequest,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiTooManyRequests,
  apiServerError,
} from '../lib/infrastructure/response';

describe('lib/infrastructure/response', () => {
  it('apiOk returns 200 with default body', async () => {
    const res = apiOk();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('apiOk echoes provided data', async () => {
    const res = apiOk({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: 'world' });
  });

  it('apiCreated returns 201', async () => {
    const res = apiCreated({ id: 1 });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1 });
  });

  it('apiCreated default body', async () => {
    const res = apiCreated();
    expect(await res.json()).toEqual({ ok: true });
  });

  it('apiError produces a 500 with message', async () => {
    const res = apiError(new Error('boom'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });

  it('apiError appends the cause', async () => {
    const err = new Error('root');
    (err as any).cause = 'db down';
    const res = apiError(err);
    expect(await res.json()).toEqual({ error: 'root: db down' });
  });

  it('apiError supports a custom status', () => {
    expect(apiError(new Error('x'), 422).status).toBe(422);
  });

  it('returns auth/limit status helpers', async () => {
    expect(apiBadRequest('bad').status).toBe(400);
    expect((await apiBadRequest('bad').json()).error).toBe('bad');
    expect(apiUnauthorized().status).toBe(401);
    expect(apiUnauthorized('nope').json).toBeDefined();
    expect(apiForbidden().status).toBe(403);
    expect(apiNotFound().status).toBe(404);
    expect(apiTooManyRequests().status).toBe(429);
    expect(apiServerError().status).toBe(503);
  });

  it('uses default messages when omitted', async () => {
    expect(await apiForbidden().json()).toEqual({ error: 'Forbidden' });
    expect(await apiNotFound().json()).toEqual({ error: 'Not found' });
    expect(await apiTooManyRequests().json()).toEqual({ error: 'Too many requests' });
    expect(await apiServerError().json()).toEqual({ error: 'Internal server error' });
    expect(await apiUnauthorized().json()).toEqual({ error: 'Unauthorized' });
  });
});