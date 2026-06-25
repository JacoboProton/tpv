import { NextResponse } from 'next/server';
import { setupFiskaly, getFiskalyConfig, listSigners, createClient, createSigner } from '../../../../lib/fiskaly';

export async function GET() {
  try {
    const config = await getFiskalyConfig();
    const signers = await listSigners().catch(() => []);
    return NextResponse.json({ configured: !!(config.client_id), config, signersLength: signers.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.testSigner) {
      const s = await createSigner();
      return NextResponse.json({ raw: s });
    }
    if (body.testClient) {
      const c = await createClient();
      return NextResponse.json({ raw: c });
    }
    if (body.genAgreement) {
      const pdfBuffer = await (await import('../../../../lib/fiskaly')).generateTaxpayerAgreement();
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="acuerdo-colaboracion-fiskaly.pdf"',
        },
      });
    }
    if (body.uploadAgreement) {
      const r = await (await import('../../../../lib/fiskaly')).uploadTaxpayerAgreement(body.signedPdfBase64);
      return NextResponse.json(r);
    }
    const result = await setupFiskaly(body.legalName);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
