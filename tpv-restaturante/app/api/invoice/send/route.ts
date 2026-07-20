import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { sales } from '../../../../db/schema';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { saleId, pdfBase64, filename, to } = await req.json() as any;

    if (!saleId || !pdfBase64) {
      return NextResponse.json({ error: 'saleId y pdfBase64 requeridos' }, { status: 400 });
    }

    let email = to;
    if (!email) {
      const rows = await db.select({ invoiceEmail: sales.invoiceEmail })
        .from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
        .limit(1);
      if (rows.length === 0) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
      email = rows[0].invoiceEmail;
    }

    if (!email) {
      return NextResponse.json({ error: 'No hay email de destino' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser) {
      try {
        // @ts-expect-error - nodemailer has no types
        const { createTransport } = await import('nodemailer');
        const transporter = createTransport({
          host: smtpHost,
          port: parseInt(smtpPort || '587'),
          secure: smtpPort === '465',
          auth: { user: smtpUser, pass: smtpPass },
        });
        const fromEmail = process.env.SMTP_FROM || smtpUser;
        await transporter.sendMail({
          from: `"${process.env.SMTP_FROM_NAME || 'La Comanda'}" <${fromEmail}>`,
          to: email,
          subject: `Factura ${filename || saleId}`,
          text: 'Adjunto encontrará su factura electrónica.',
          attachments: [{ filename: filename || `factura_${saleId}.pdf`, content: pdfBase64, encoding: 'base64' }],
        });
        return NextResponse.json({ ok: true, method: 'smtp', email });
      } catch (smtpErr: any) {
        console.warn('[Invoice Send] SMTP falló, modo descarga:', (smtpErr as Error).message);
        return NextResponse.json({ ok: false, method: 'smtp_failed', error: (smtpErr as Error).message, email });
      }
    }

    return NextResponse.json({
      ok: true,
      method: 'download',
      email,
      message: 'SMTP no configurado. Descarga manual disponible.',
    });
  } catch (err: any) {
    const msg = (err as Error).message;
    const cause = (err as Error).cause;
    return NextResponse.json({ error: cause ? `${msg}: ${cause}` : msg }, { status: 500 });
  }
}
