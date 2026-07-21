import { NextRequest } from 'next/server';
import { setupFiskaly, getFiskalyConfig, listSigners, createClient, createSigner } from '../../../../lib/fiskaly';
import { apiOk, apiError } from '../../../../lib/infrastructure/response';

export async function GET() {
  try {
    const config = await getFiskalyConfig();
    const signers = await listSigners().catch(() => []);
    return apiOk({ configured: !!(config.client_id), config, signersLength: signers.length });
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if ((body as any).testSigner) {
      const s = await createSigner();
      return apiOk({ raw: s });
    }
    if ((body as any).testClient) {
      const c = await createClient();
      return apiOk({ raw: c });
    }
    if ((body as any).genAgreement) {
      const pdfBuffer = await (await import('../../../../lib/fiskaly')).generateTaxpayerAgreement();
      return new Response(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="acuerdo-colaboracion-fiskaly.pdf"',
        },
      });
    }
    if ((body as any).uploadAgreement) {
      const r = await (await import('../../../../lib/fiskaly')).uploadTaxpayerAgreement((body as any).signedPdfBase64);
      return apiOk(r);
    }
    const result = await setupFiskaly((body as any).legalName);
    return apiOk(result);
  } catch (err) { return apiError(err); }
}
