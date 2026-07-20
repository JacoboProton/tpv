import { NextRequest, NextResponse } from 'next/server';
import { setupFiskaly, getFiskalyConfig, listSigners, createClient, createSigner } from '../../../../lib/fiskaly';

export async function GET() {
  try {
    const config = await getFiskalyConfig();
    const signers = await listSigners().catch(() => []);
    return NextResponse.json({ configured: !!(config.client_id), config, signersLength: signers.length });
  } catch (err: any) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if ((body as any).testSigner) {
      const s = await createSigner();
      return NextResponse.json({ raw: s });
    }
    if ((body as any).testClient) {
      const c = await createClient();
      return NextResponse.json({ raw: c });
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
      return NextResponse.json(r);
    }
    const result = await setupFiskaly((body as any).legalName);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
