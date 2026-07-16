import { getDb } from './drizzle';
import { paymentLogs } from '../db/schema';

interface PaymentLogOptions {
  eventId?: string | null;
  paymentIntentId?: string | null;
  operation: string;
  amountCents?: number;
  currency?: string;
  status?: string;
  tableId?: string | null;
  tableName?: string | null;
  employeeName?: string | null;
  source?: string | null;
  error?: string | null;
  stripeResponse?: unknown;
}

export async function logPayment(opts: PaymentLogOptions): Promise<void> {
  try {
    const db = getDb();
    await db.insert(paymentLogs).values({
      eventId: opts.eventId ?? null,
      paymentIntentId: opts.paymentIntentId ?? null,
      operation: opts.operation,
      amountCents: opts.amountCents ?? 0,
      currency: opts.currency ?? 'eur',
      status: opts.status ?? 'ok',
      tableId: opts.tableId ?? null,
      tableName: opts.tableName ?? null,
      employeeName: opts.employeeName ?? null,
      source: opts.source ?? null,
      error: opts.error ?? null,
      stripeResponse: opts.stripeResponse ? JSON.stringify(opts.stripeResponse).slice(0, 2000) : null,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.error('[PaymentLogger] Error al guardar log:', (e as Error).message);
  }
}
