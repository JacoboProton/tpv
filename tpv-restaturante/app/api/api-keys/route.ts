import { NextRequest } from 'next/server';
import { getTenantId } from '../../../lib/tenant';
import { requireRole } from '../../../lib/rbac';
import { apiOk, apiError, apiBadRequest, apiNotFound } from '../../../lib/infrastructure/response';
import {
  createApiKey, listApiKeys, rotateApiKey, setApiKeyActive, deleteApiKey,
  type ApiKeyClientType,
} from '../../../lib/auth/api-keys';

const CLIENT_TYPES: readonly ApiKeyClientType[] = ['pos', 'kds', 'mobile'];

function parseClientType(v: unknown): ApiKeyClientType | null {
  return CLIENT_TYPES.find((t) => t === v) ?? null;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const tenantId = getTenantId(req);
    const keys = await listApiKeys(tenantId);
    return apiOk({ keys });
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const clientType = parseClientType(body.clientType);
    if (!clientType) return apiBadRequest('clientType requerido (pos | kds | mobile)');
    const tenantId = getTenantId(req);
    const label = typeof body.label === 'string' ? body.label.slice(0, 80) : '';
    const { row, key } = await createApiKey(tenantId, clientType, label);
    return apiOk({ key, apiKey: row });
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) return apiBadRequest('id requerido');
    const tenantId = getTenantId(req);

    if (body.action === 'rotate') {
      const result = await rotateApiKey(tenantId, id);
      if (!result) return apiNotFound('API key no encontrada');
      return apiOk({ key: result.key, apiKey: result.row });
    }

    if (body.action === 'activate' || body.action === 'deactivate') {
      const active = body.action === 'activate';
      const ok = await setApiKeyActive(tenantId, id, active);
      if (!ok) return apiNotFound('API key no encontrada');
      return apiOk({ ok: true, active });
    }

    return apiBadRequest('Acción no válida (rotate | activate | deactivate)');
  } catch (err) { return apiError(err); }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) return apiBadRequest('id requerido');
    const tenantId = getTenantId(req);
    const ok = await deleteApiKey(tenantId, id);
    if (!ok) return apiNotFound('API key no encontrada');
    return apiOk();
  } catch (err) { return apiError(err); }
}
