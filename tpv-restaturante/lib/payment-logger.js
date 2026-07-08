import { sql } from './db';

export async function logPayment(opts) {
  try {
    await sql`
      INSERT INTO payment_logs (
        event_id, payment_intent_id, operation, amount_cents, currency,
        status, table_id, table_name, employee_name, source, error,
        stripe_response, created_at
      ) VALUES (
        ${opts.eventId ?? null},
        ${opts.paymentIntentId ?? null},
        ${opts.operation},
        ${opts.amountCents ?? 0},
        ${opts.currency ?? 'eur'},
        ${opts.status ?? 'ok'},
        ${opts.tableId ?? null},
        ${opts.tableName ?? null},
        ${opts.employeeName ?? null},
        ${opts.source ?? null},
        ${opts.error ?? null},
        ${opts.stripeResponse ? JSON.stringify(opts.stripeResponse).slice(0, 2000) : null},
        ${Date.now()}
      )
    `;
  } catch (e) {
    console.error('[PaymentLogger] Error al guardar log:', e.message);
  }
}
