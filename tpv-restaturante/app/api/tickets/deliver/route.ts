import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../lib/drizzle';
import { getTenantId } from '../../../../lib/tenant';
import { sales, verifactuRegistros, settings } from '../../../../db/schema';
import { apiOk, apiError, apiBadRequest, apiNotFound } from '../../../../lib/infrastructure/response';
import { requireRole } from '../../../../lib/rbac';
import { buildTicketHtml } from '../../../../lib/ticket-template';
import { qrDataUrl } from '../../../../lib/qr';
import { TicketDeliverBody } from '@/lib/schemas/api-schemas';

async function getSettings(tenantId: string): Promise<Record<string, string>> {
  const db = getDb();
  const rows = await db.select({ key: settings.key, value: settings.value }).from(settings)
    .where(eq(settings.tenantId, tenantId));
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

async function sendTwilio(accountSid: string, authToken: string, from: string, to: string, body: string, contentSid?: string) {
  const cred = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const params: Record<string, string> = { To: to, From: from };
  if (contentSid) {
    params.ContentSid = contentSid;
    params.ContentVariables = JSON.stringify({});
  } else {
    params.Body = body;
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${cred}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
}

interface TicketSale {
  id: string;
  total: number;
  tableName?: string | null;
  employeeName?: string | null;
  items?: Array<{ name?: string; qty?: number; price?: number; voided?: boolean }>;
  discount?: number;
  discountAmount?: number;
  tip?: number;
  tipMethod?: string;
  totalWithTip?: number;
  closedAt: number;
  ticketNumber?: number | string | null;
  invoiceEmail?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toItems(v: unknown): TicketSale['items'] {
  if (!Array.isArray(v)) return undefined;
  return v.flatMap((i) => isRecord(i)
    ? [{
        name: typeof i.name === 'string' ? i.name : undefined,
        qty: typeof i.qty === 'number' ? i.qty : undefined,
        price: typeof i.price === 'number' ? i.price : undefined,
        voided: typeof i.voided === 'boolean' ? i.voided : undefined,
      }]
    : []);
}

function buildTicketFor(sale: TicketSale, s: Record<string, string>, qrDataUrlValue: string | null) {
  const items = (sale.items || []).filter(i => !i.voided).map(i => ({
    name: i.name || 'Artículo',
    qty: i.qty || 1,
    price: i.price || 0,
  }));
  const subtotal = items.reduce((acc, i) => acc + i.price * i.qty, 0);
  const discountAmount = sale.discountAmount || 0;
  const totalConIgic = subtotal - discountAmount;
  const baseImponible = Math.round(totalConIgic * 100 / 1.07) / 100;
  const cuotaIgic = totalConIgic - baseImponible;
  return buildTicketHtml({
    items, subtotal, discountAmount, totalConIgic, baseImponible, cuotaIgic,
    tip: sale.tip || 0,
    tipMethod: sale.tipMethod || '',
    totalWithTip: sale.totalWithTip || sale.total || 0,
    restaurantName: s.restaurantName, companyCif: s.companyCif,
    companyAddress: s.companyAddress, companyPhone: s.companyPhone,
    logoUrl: s.logoUrl, footerText: s.footerText,
    ticketWidth: s.ticketWidth != null ? String(s.ticketWidth) : undefined,
    tableName: sale.tableName || '',
    employeeName: sale.employeeName || '',
    ticketNumber: sale.ticketNumber != null ? `#${sale.ticketNumber}` : '',
    date: new Date(sale.closedAt).toLocaleString('es-ES'),
    qrDataUrl: qrDataUrlValue || undefined,
    qrLabel: 'Verifique su ticket con la app AEAT / Verifactu',
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = TicketDeliverBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const { saleId, to } = parsed.data;

    if (!saleId) return apiBadRequest('saleId requerido');
    if (!to?.email && !to?.phone) return apiBadRequest('Indica email o teléfono de destino');

    const [row] = await db.select().from(sales)
      .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
      .limit(1);
    if (!row) return apiNotFound('Venta no encontrada');

    const sale: TicketSale = {
      id: row.id, total: Number(row.total || 0), tableName: row.tableName,
      employeeName: row.employeeName, items: toItems(row.items),
      discount: Number(row.discount || 0), discountAmount: Number(row.discountAmount || 0),
      tip: Number(row.tip || 0), tipMethod: row.tipMethod || '', totalWithTip: Number(row.totalWithTip || row.total || 0),
      closedAt: Number(row.closedAt), ticketNumber: row.ticketNumber,
      invoiceEmail: row.invoiceEmail ?? undefined,
    };

    let qrUrl = '';
    const [reg] = await db.select({ qrUrl: verifactuRegistros.qrUrl }).from(verifactuRegistros)
      .where(and(eq(verifactuRegistros.saleId, saleId), eq(verifactuRegistros.tenantId, tenantId)))
      .limit(1);
    if (reg) qrUrl = reg.qrUrl ?? '';

    const s = await getSettings(tenantId);
    const qrData = qrUrl ? await qrDataUrl(qrUrl) : null;
    const html = buildTicketFor(sale, s, qrData);
    const totalEuro = (sale.totalWithTip || sale.total || 0).toFixed(2) + '€';
    const ref = sale.ticketNumber != null ? `Ticket #${sale.ticketNumber}` : `Ticket ${sale.id}`;

    const results: Record<string, string> = {};

    if (to.email) {
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      if (!smtpHost || !smtpUser) {
        results.email = 'no_smtp';
      } else {
        try {
          // @ts-expect-error - nodemailer has no types
          const { createTransport } = await import('nodemailer');
          const transporter = createTransport({
            host: smtpHost,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: { user: smtpUser, pass: process.env.SMTP_PASS },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          });
          const fromEmail = process.env.SMTP_FROM || smtpUser;
          const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || s.restaurantName || 'La Comanda'}" <${fromEmail}>`,
            to: to.email,
            subject: `${ref} · ${totalEuro}`,
            html,
          };
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('SMTP timeout')), 12000);
            transporter.sendMail(mailOptions, (err: unknown) => {
              clearTimeout(timer);
              if (err) reject(err instanceof Error ? err : new Error(String(err)));
              else resolve();
            });
          });
          results.email = 'sent';
        } catch (e) {
          results.email = `error:${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }

    if (to.phone) {
      const sid = s.waitlistTwilioSid;
      const token = s.waitlistTwilioToken;
      const whatsappNumber = s.waitlistTwilioWhatsApp;
      const contentSid = s.waitlistTwilioContentSid;
      if (!sid || !token || !whatsappNumber) {
        results.whatsapp = 'no_twilio';
      } else {
        const msg = `${ref}\nTotal: ${totalEuro}\nGracias por su visita.`
          + (qrUrl ? `\nVerifique su ticket con la app AEAT: ${qrUrl}` : '');
        try {
          await sendTwilio(sid, token, `whatsapp:${whatsappNumber}`, `whatsapp:${to.phone}`, msg, contentSid);
          results.whatsapp = 'sent';
        } catch (e) {
          results.whatsapp = `error:${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }

    return apiOk({ ok: true, results });
  } catch (err) { return apiError(err); }
}