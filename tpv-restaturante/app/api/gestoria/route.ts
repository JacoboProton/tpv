import { NextRequest } from 'next/server';
import { sql, SQL } from 'drizzle-orm';
import { ZodError } from 'zod';
import { getDb } from '../../../lib/drizzle';
import { getTenantId } from '../../../lib/tenant';
import { validateRequest, ConfirmSchema } from '../../../lib/gestoriaSchemas';
import { apiOk, apiError, apiBadRequest, apiNotFound, apiUnauthorized } from '../../../lib/infrastructure/response';
import { requireRole } from '../../../lib/rbac';
import { GestoriaBody } from '@/lib/schemas/api-schemas';

type Row = Record<string, unknown>;

interface GestoriaLine {
  id?: string;
  document_id?: string;
  description?: string;
  category?: string;
  base_amount?: number | string;
  vat_rate?: number | string;
  vat_amount?: number | string;
  withholding?: number | string;
  zone?: string;
  type?: string;
  sort_order?: number | string;
}

interface GestoriaDocRow {
  id: string;
  type: string;
  file_name: string;
  provider_name: string | null;
  provider_nif: string | null;
  document_date?: string | null;
  confirmed?: boolean;
  is_periodic?: boolean;
  notes?: string | null;
  created_at?: number;
  lines?: GestoriaLine[] | string;
}

interface PayrollRow extends Row {
  id: string;
  employee_name: string;
  employee_nif: string;
  month: number;
  year: number;
  gross_amount: number | string;
  irpf_withholding: number | string;
  social_security_worker: number | string;
  social_security_company: number | string;
  net_amount: number | string;
  notes: string | null;
  created_at: number;
}

function parseLines(value: unknown): GestoriaLine[] {
  const list: unknown[] = typeof value === 'string' ? (() => {
    try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  })() : (Array.isArray(value) ? value : []);
  return list.flatMap((l) => {
    if (typeof l !== 'object' || l === null || Array.isArray(l)) return [];
    const r = l as Record<string, unknown>;
    return [{
      id: optStr(r.id), document_id: optStr(r.document_id), description: optStr(r.description),
      category: optStr(r.category), zone: optStr(r.zone), type: optStr(r.type),
      base_amount: optNumStr(r.base_amount), vat_rate: optNumStr(r.vat_rate), vat_amount: optNumStr(r.vat_amount),
      withholding: optNumStr(r.withholding), sort_order: optNumStr(r.sort_order),
    }];
  });
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function optNumStr(v: unknown): number | string | undefined {
  return typeof v === 'number' || typeof v === 'string' ? v : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function makeId() { return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

async function qr<T extends object = Row>(db: ReturnType<typeof getDb>, q: SQL): Promise<T[]> {
  const r = await db.execute(q);
  const rows: unknown[] = r.rows;
  return rows.filter((x): x is T => isRecord(x));
}

function validateErrorMsg(e: unknown): string {
  if (e instanceof ZodError) return e.issues.map((i) => i.message).join('; ');
  return e instanceof Error ? e.message : String(e);
}

async function getOperationsData(tenantId: string) {
  const db = getDb();
  const docs = await qr<GestoriaDocRow>(db, sql`
    SELECT d.provider_nif, d.provider_name, d.file_name, d.type,
      COALESCE(json_agg(json_build_object(
        'base_amount', l.base_amount, 'zone', l.zone, 'type', l.type
      )) FILTER (WHERE l.id IS NOT NULL), '[]') as lines
    FROM gestoria_documents d
    LEFT JOIN gestoria_document_lines l ON l.document_id = d.id
    WHERE d.confirmed = true AND d.tenant_id = ${tenantId}
    GROUP BY d.id
  `);

  const entregas_intra: Array<{ nif: string; name: string; base: number; operacion: string }> = [];
  const adquisiciones_intra: Array<{ nif: string; name: string; base: number; operacion: string }> = [];

  for (const d of docs) {
    const lines = parseLines(d.lines);
    const euLines = lines.filter((l) => l.zone === 'eu');
    for (const l of euLines) {
      const entry = { nif: d.provider_nif || '', name: d.provider_name || d.file_name || '', base: Number(l.base_amount || 0), operacion: l.type === 'service' ? 'servicio' : 'bien' };
      if (d.type === 'expense') adquisiciones_intra.push(entry);
      else entregas_intra.push(entry);
    }
  }

  const total = [...entregas_intra, ...adquisiciones_intra].reduce((s: number, e) => s + e.base, 0);
  return { entregas_intra, adquisiciones_intra, total_operaciones: round2(total) };
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'operations') {
      const data = await getOperationsData(tenantId);
      return apiOk(data);
    }

    if (action === 'settings') {
      const rows = await qr<{ key: string; value: string }>(db, sql`SELECT key, value FROM gestoria_settings WHERE tenant_id = ${tenantId}`);
      const s: Record<string, string> = {};
      for (const r of rows) s[r.key] = r.value;
      return apiOk(s);
    }

    if (action === 'documents') {
      const type = searchParams.get('type') || 'expense';
      const docs = await qr(db, sql`
        SELECT d.*, COALESCE(
          json_agg(json_build_object(
            'id', l.id, 'description', l.description, 'category', l.category,
            'baseAmount', l.base_amount, 'vatRate', l.vat_rate, 'vatAmount', l.vat_amount,
            'withholding', l.withholding, 'zone', l.zone, 'type', l.type, 'sortOrder', l.sort_order
          ) ORDER BY l.sort_order) FILTER (WHERE l.id IS NOT NULL),
          '[]'
        ) as lines
        FROM gestoria_documents d
        LEFT JOIN gestoria_document_lines l ON l.document_id = d.id
        WHERE d.type = ${type} AND d.tenant_id = ${tenantId}
        GROUP BY d.id ORDER BY d.created_at DESC
      `);
      return apiOk(docs);
    }

    if (action === 'payrolls') {
      const rows = await qr<PayrollRow>(db, sql`SELECT * FROM gestoria_payrolls WHERE tenant_id = ${tenantId} ORDER BY year DESC, month DESC, created_at DESC`);
      return apiOk(rows.map((r) => ({
        id: r.id, employeeName: r.employee_name, employeeNif: r.employee_nif,
        month: r.month, year: r.year, grossAmount: Number(r.gross_amount),
        irpfWithholding: Number(r.irpf_withholding),
        ssWorker: Number(r.social_security_worker), ssCompany: Number(r.social_security_company),
        netAmount: Number(r.net_amount), notes: r.notes, createdAt: r.created_at,
      })));
    }

    if (action === 'taxmodels') {
      const rows = await qr<Row>(db, sql`SELECT * FROM gestoria_tax_models WHERE tenant_id = ${tenantId} ORDER BY year DESC, model_code, quarter`);
      return apiOk(rows.map((r) => {
        const data: unknown = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return { ...r, data };
      }));
    }

    if (action === 'authorization') {
      const [row] = await qr(db, sql`SELECT * FROM gestoria_authorization WHERE id = 1 AND tenant_id = ${tenantId}`);
      return apiOk(row || null);
    }

      return apiBadRequest('unknown action');
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = GestoriaBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    try { validateRequest(body); } catch (e) { return apiBadRequest(validateErrorMsg(e)); }
    const { action } = body;

    if (action === 'document') {
      if (!body.document) return apiBadRequest('missing document');
      const doc = body.document;
      const id = doc.id || makeId();
      await db.execute(sql`INSERT INTO gestoria_documents (id, type, file_name, provider_name, provider_nif, document_date, confirmed, is_periodic, notes, created_at, tenant_id) VALUES (${id}, ${doc.type}, ${doc.fileName || ''}, ${doc.providerName || ''}, ${doc.providerNif || ''}, ${doc.documentDate || ''}, ${doc.confirmed || false}, ${doc.isPeriodic || false}, ${doc.notes || ''}, ${Date.now()}, ${tenantId})`);
      if (doc.lines && doc.lines.length > 0) {
        for (let i = 0; i < doc.lines.length; i++) {
          const l = doc.lines[i];
          const lid = l.id || makeId();
          await db.execute(sql`INSERT INTO gestoria_document_lines (id, document_id, description, category, base_amount, vat_rate, vat_amount, withholding, zone, type, sort_order, tenant_id) VALUES (${lid}, ${id}, ${l.description}, ${l.category || ''}, ${l.baseAmount}, ${l.vatRate}, ${l.vatAmount}, ${l.withholding || 0}, ${l.zone || 'spain'}, ${l.type || 'good'}, ${i}, ${tenantId})`);
        }
      }
      return apiOk({ ok: true, id });
    }

    if (action === 'payroll') {
      if (!body.payroll) return apiBadRequest('missing payroll');
      const p = body.payroll;
      const id = p.id || makeId();
      await db.execute(sql`
        INSERT INTO gestoria_payrolls (id, employee_name, employee_nif, month, year, gross_amount, irpf_withholding, social_security_worker, social_security_company, net_amount, notes, created_at, tenant_id)
        VALUES (${id}, ${p.employeeName}, ${p.employeeNif}, ${p.month}, ${p.year}, ${p.grossAmount}, ${p.irpfWithholding}, ${p.ssWorker}, ${p.ssCompany}, ${p.netAmount}, ${p.notes || ''}, ${Date.now()}, ${tenantId})
        ON CONFLICT (id) DO UPDATE SET
          employee_name = EXCLUDED.employee_name, employee_nif = EXCLUDED.employee_nif,
          month = EXCLUDED.month, year = EXCLUDED.year,
          gross_amount = EXCLUDED.gross_amount, irpf_withholding = EXCLUDED.irpf_withholding,
          social_security_worker = EXCLUDED.social_security_worker,
          social_security_company = EXCLUDED.social_security_company,
          net_amount = EXCLUDED.net_amount, notes = EXCLUDED.notes
      `);
      return apiOk({ ok: true, id });
    }

    if (action === 'calculate') {
      const modelCode = String(body.modelCode || '');
      const year = Number(body.year) || 0;
      const quarter = Number(body.quarter) || 0;
      if (!modelCode || !year || !quarter) return apiBadRequest('modelCode, year, quarter required');
      const data = await calculateTaxModelDraft(modelCode, year, quarter, tenantId);
      const [existing] = await qr(db, sql`SELECT id FROM gestoria_tax_models WHERE model_code = ${modelCode} AND year = ${year} AND quarter = ${quarter} AND tenant_id = ${tenantId}`);
      if (existing) {
        await db.execute(sql`UPDATE gestoria_tax_models SET data = ${JSON.stringify(data)}, updated_at = ${Date.now()}, status = 'draft' WHERE id = ${existing.id} AND tenant_id = ${tenantId}`);
        return apiOk({ ok: true, id: existing.id, data });
      } else {
        const id = makeId();
        await db.execute(sql`INSERT INTO gestoria_tax_models (id, model_code, year, quarter, status, data, due_date, created_at, updated_at, tenant_id) VALUES (${id}, ${modelCode}, ${year}, ${quarter}, 'draft', ${JSON.stringify(data)}, ${getDueDate(modelCode, year, quarter)}, ${Date.now()}, ${Date.now()}, ${tenantId})`);
        return apiOk({ ok: true, id, data });
      }
    }

      return apiBadRequest('unknown action');
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = GestoriaBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    try { validateRequest(body); } catch (e) { return apiBadRequest(validateErrorMsg(e)); }
    const { action } = body;

    if (action === 'settings') {
      if (!body.settings) return apiBadRequest('settings required');
      for (const [key, value] of Object.entries(body.settings)) {
        await db.execute(sql`INSERT INTO gestoria_settings (key, value, tenant_id) VALUES (${key}, ${String(value)}, ${tenantId}) ON CONFLICT (key, tenant_id) DO UPDATE SET value = EXCLUDED.value`);
      }
      return apiOk();
    }

    if (action === 'confirm') {
      await db.execute(sql`UPDATE gestoria_documents SET confirmed = NOT confirmed WHERE id = ${body.id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }

    if (action === 'status') {
      await db.execute(sql`UPDATE gestoria_tax_models SET status = ${body.status}, updated_at = ${Date.now()} WHERE id = ${body.id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }

    if (action === 'authorization') {
      const { name, nif, signedAt, socialRed, revoke } = body;
      if (revoke) {
        await db.execute(sql`UPDATE gestoria_authorization SET revoked = true, revoked_at = ${Date.now()} WHERE id = 1 AND tenant_id = ${tenantId}`);
      } else {
        await db.execute(sql`UPDATE gestoria_authorization SET accountant_name = ${name || ''}, accountant_nif = ${nif || ''}, signed_at = ${signedAt || Date.now()}, social_security_red = ${socialRed || false}, revoked = false, revoked_at = NULL WHERE id = 1 AND tenant_id = ${tenantId}`);
      }
      return apiOk();
    }

      return apiBadRequest('unknown action');
  } catch (err) { return apiError(err); }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['admin', 'camarero'])(req);
  if (!auth.authorized) return apiError(new Error(auth.error), auth.status);
  try {
    const db = getDb();
    const tenantId = getTenantId(req);
    const parsed = GestoriaBody.safeParse(await req.json());
    if (!parsed.success) return apiBadRequest(parsed.error.message);
    const body = parsed.data;
    try { ConfirmSchema.parse(body); } catch (e) { return apiBadRequest(validateErrorMsg(e)); }
    const { action, id } = body;
    if (action === 'document') {
      await db.execute(sql`DELETE FROM gestoria_documents WHERE id = ${id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }
    if (action === 'payroll') {
      await db.execute(sql`DELETE FROM gestoria_payrolls WHERE id = ${id} AND tenant_id = ${tenantId}`);
      return apiOk();
    }
      return apiBadRequest('unknown action');
  } catch (err) { return apiError(err); }
}

function getDueDate(modelCode: string, year: number, quarter: number) {
  if (['390','190','180'].includes(modelCode)) return `${year + 1}-01-31`;
  const deadlines: Record<number, string> = { 1: '04-20', 2: '07-20', 3: '10-20', 4: '01-30' };
  const dd = deadlines[quarter] || '01-30';
  const y = quarter === 4 ? year + 1 : year;
  return `${y}-${dd}`;
}

async function calculateTaxModelDraft(modelCode: string, year: number, quarter: number, tenantId: string): Promise<Record<string, unknown>> {
  const db = getDb();
  const qStart = new Date(year, (quarter - 1) * 3, 1).getTime();
  const qEnd = new Date(year, quarter * 3, 0, 23, 59, 59, 999).getTime();

  const sales: Row[] = await qr(db, sql`SELECT * FROM sales WHERE closed_at >= ${qStart} AND closed_at <= ${qEnd} AND tenant_id = ${tenantId} ORDER BY closed_at`);
  const confirmedDocs: GestoriaDocRow[] = await qr<GestoriaDocRow>(db, sql`SELECT d.*, (SELECT json_agg(l.*) FROM gestoria_document_lines l WHERE l.document_id = d.id) as lines FROM gestoria_documents d WHERE d.confirmed = true AND d.tenant_id = ${tenantId} AND d.created_at >= ${qStart} AND d.created_at <= ${qEnd}`);

  const salesTotal = sales.reduce((s: number, r) => s + Number(r.total || 0), 0);
  const salesVat = salesTotal * 0.21;
  const toLines = (d: GestoriaDocRow) => parseLines(d.lines);
  const sumBase = (s: number, l: GestoriaLine) => s + Number(l.base_amount || 0);
  const sumVat = (s: number, l: GestoriaLine) => s + Number(l.vat_amount || 0);
  const expenseTotal = confirmedDocs.reduce((s: number, d) => s + toLines(d).reduce(sumBase, 0), 0);
  const expenseVat = confirmedDocs.reduce((s: number, d) => s + toLines(d).reduce(sumVat, 0), 0);

  const payrolls: PayrollRow[] = await qr(db, sql`SELECT * FROM gestoria_payrolls WHERE tenant_id = ${tenantId} AND year = ${year} AND ((${quarter} = 1 AND month >= 1 AND month <= 3) OR (${quarter} = 2 AND month >= 4 AND month <= 6) OR (${quarter} = 3 AND month >= 7 AND month <= 9) OR (${quarter} = 4 AND month >= 10 AND month <= 12))`);

  const totalIrpfWithholding = payrolls.reduce((s: number, p) => s + Number(p.irpf_withholding || 0), 0);
  const totalSsCompany = payrolls.reduce((s: number, p) => s + Number(p.social_security_company || 0), 0);
  const sumGross = (s: number, p: PayrollRow) => s + Number(p.gross_amount || 0);

  switch (modelCode) {
    case '303': {
      const euSales = salesTotal * 0.01;
      const euPurchases = confirmedDocs.reduce((s: number, d) => s + toLines(d).filter((l) => l.zone === 'eu').reduce(sumBase, 0), 0);
      return {
        casilla_01: round2(salesTotal), casilla_03: round2(salesVat), casilla_07: round2(euSales),
        casilla_08: round2(salesTotal + euSales), casilla_09: round2(expenseTotal), casilla_11: round2(expenseVat),
        casilla_13: round2(euPurchases), casilla_14: round2(expenseVat + euPurchases),
        resultado: round2(salesVat + euSales - expenseVat - euPurchases),
      };
    }
    case '130': {
      const income = salesTotal; const expenses = expenseTotal + totalSsCompany; const netIncome = income - expenses; const taxBase = netIncome > 0 ? netIncome : 0;
      return { ingresos: round2(income), gastos: round2(expenses), rendimiento: round2(netIncome), base_imponible: round2(taxBase), cuota_integra: round2(taxBase * 0.20), retenciones: round2(totalIrpfWithholding), resultado: round2(taxBase * 0.20 - totalIrpfWithholding) };
    }
    case '111': return { trabajadores: payrolls.length, total_remuneraciones: round2(payrolls.reduce(sumGross, 0)), retencion_trabajo: round2(totalIrpfWithholding), retencion_profesionales: 0, total_retenciones: round2(totalIrpfWithholding) };
    case '115': return { alquileres: 0, base_retencion: 0, retencion_ingresada: 0, nota: 'No hay alquileres registrados' };
    case '349': {
      const euDocs = confirmedDocs.reduce((acc: Array<{ nif: string; name: string; base: number; operacion: string }>, d) => {
        const lines = toLines(d).filter((l) => l.zone === 'eu');
        return acc.concat(lines.map((l) => ({ nif: d.provider_nif || '', name: d.provider_name || d.file_name || '', base: Number(l.base_amount || 0), operacion: l.type === 'service' ? 'servicio' : 'bien' })));
      }, []);
      return { entregas_intra: [], adquisiciones_intra: euDocs, total_operaciones: round2(euDocs.reduce((s: number, e) => s + e.base, 0)) };
    }
    case '347': {
      interface ProviderAcc { nif: string; name: string; total: number; operations: number }
      const providers = confirmedDocs.reduce((acc: Record<string, ProviderAcc>, d) => {
        if (!d.provider_nif) return acc;
        const base = toLines(d).reduce(sumBase, 0);
        if (base < 3005.06) return acc;
        const key = d.provider_nif;
        if (!acc[key]) acc[key] = { nif: key, name: d.provider_name || '', total: 0, operations: 0 };
        acc[key].total += base; acc[key].operations++;
        return acc;
      }, {} as Record<string, ProviderAcc>);
      return { operaciones: Object.values(providers), nota: 'Solo operaciones > 3.005,06€' };
    }
    case '390': {
      const q1 = await calculateTaxModelDraft('303', year, 1, tenantId);
      const q2 = await calculateTaxModelDraft('303', year, 2, tenantId);
      const q3 = await calculateTaxModelDraft('303', year, 3, tenantId);
      const q4 = await calculateTaxModelDraft('303', year, 4, tenantId);
      return { anual: true, base_imponible: round2(Number(q1.casilla_01 || 0) + Number(q2.casilla_01 || 0) + Number(q3.casilla_01 || 0) + Number(q4.casilla_01 || 0)), iva_devengado: round2(Number(q1.casilla_03 || 0) + Number(q2.casilla_03 || 0) + Number(q3.casilla_03 || 0) + Number(q4.casilla_03 || 0)), iva_deducible: round2(Number(q1.casilla_11 || 0) + Number(q2.casilla_11 || 0) + Number(q3.casilla_11 || 0) + Number(q4.casilla_11 || 0)), resultado: round2(Number(q1.resultado || 0) + Number(q2.resultado || 0) + Number(q3.resultado || 0) + Number(q4.resultado || 0)), trimestres: [q1, q2, q3, q4] };
    }
    case '190': return { anual: true, empleados: payrolls.length, total_remuneraciones: round2(payrolls.reduce(sumGross, 0)), retenciones: round2(payrolls.reduce((s: number, p) => s + Number(p.irpf_withholding || 0), 0)) };
    case '180': return { anual: true, alquileres: 0, retencion_ingresada: 0, nota: 'No hay alquileres registrados' };
    default: return { nota: `Modelo ${modelCode} no implementado` };
  }
}

function round2(n: string | number) { return Math.round(Number(n) * 100) / 100; }
