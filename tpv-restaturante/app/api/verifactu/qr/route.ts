import { NextRequest } from 'next/server';
import { qrDataUrl } from '../../../../lib/qr';
import { apiOk, apiBadRequest, apiError } from '../../../../lib/infrastructure/response';
import { requireRole } from '../../../../lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  const text = req.nextUrl.searchParams.get('text');
  if (!text) return apiBadRequest('text requerido');
  try {
    const dataUrl = await qrDataUrl(text);
    return apiOk({ dataUrl });
  } catch (err) { return apiError(err); }
}