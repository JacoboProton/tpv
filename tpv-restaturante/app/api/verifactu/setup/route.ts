import { NextRequest } from 'next/server';
import { setupFiskaly, getFiskalyConfig, listSigners, createClient, createSigner } from '../../../../lib/fiskaly';
import { apiOk, apiError } from '../../../../lib/infrastructure/response';
import { requireRole } from '../../../../lib/rbac';

export async function GET() {
  const auth = await requireRole(['admin'])(null as unknown as NextRequest);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const config = await getFiskalyConfig();
    const signers = await listSigners().catch(() => []);
    return apiOk({ configured: !!(config.client_id), config, signersLength: signers.length });
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}));
    if (body.testSigner) {
      const s = await createSigner();
      return apiOk({ raw: s });
    }
    if (body.testClient) {
      const c = await createClient();
      return apiOk({ raw: c });
    }
    if (body.genAgreement) {
      const pdfBuffer = await (await import('../../../../lib/fiskaly')).generateTaxpayerAgreement();
      return new Response(pdfBuffer as unknown as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="acuerdo-colaboracion-fiskaly.pdf"',
        },
      });
    }
    if (body.uploadAgreement) {
      const r = await (await import('../../../../lib/fiskaly')).uploadTaxpayerAgreement(body.signedPdfBase64 as string);
      return apiOk(r);
    }
    const result = await setupFiskaly(body.legalName as string);
    return apiOk(result);
  } catch (err) { return apiError(err); }
}
