// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';

// POST /api/invoice/send
// body: { saleId, pdfBase64, filename, to? }
export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req);
    const { saleId, pdfBase64, filename, to } = await req.json() as any;

    if (!saleId || !pdfBase64) {
      return NextResponse.json({ error: 'saleId y pdfBase64 requeridos' }, { status: 400 });
    }

    let email = to;
    if (!email) {
      const rows = await sql`SELECT invoice_email FROM sales WHERE id = ${saleId} AND tenant_id = ${tenantId} LIMIT 1`;
      if (rows.length === 0) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
      email = rows[0].invoice_email;
    }

    if (!email) {
      return NextResponse.json({ error: 'No hay email de destino' }, { status: 400 });
    }

    // Try to send via SMTP if configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser) {
      try {
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

    // Without SMTP config, return the PDF for download (frontend handles it)
    return NextResponse.json({
      ok: true,
      method: 'download',
      email,
      message: 'SMTP no configurado. Descarga manual disponible.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}