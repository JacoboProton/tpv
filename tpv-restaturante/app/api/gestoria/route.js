import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { getTenantId } from '../../../lib/tenant';
import { validateRequest, ConfirmSchema } from '../../../lib/gestoriaSchemas';

function makeId() { return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

async function getOperationsData(tenantId) {
  const docs = await sql`
    SELECT d.provider_nif, d.provider_name, d.file_name, d.type,
      COALESCE(json_agg(json_build_object(
        'base_amount', l.base_amount, 'zone', l.zone, 'type', l.type
      )) FILTER (WHERE l.id IS NOT NULL), '[]') as lines
    FROM gestoria_documents d
    LEFT JOIN gestoria_document_lines l ON l.document_id = d.id
    WHERE d.confirmed = true AND d.tenant_id = ${tenantId}
    GROUP BY d.id
  `;

  const entregas_intra = [];
  const adquisiciones_intra = [];

  for (const d of docs) {
    const lines = typeof d.lines === 'string' ? JSON.parse(d.lines) : d.lines;
    const euLines = lines.filter(l => l.zone === 'eu');
    for (const l of euLines) {
      const entry = {
        nif: d.provider_nif || '',
        name: d.provider_name || d.file_name || '',
        base: Number(l.base_amount || 0),
        operacion: l.type === 'service' ? 'servicio' : 'bien',
      };
      if (d.type === 'expense') {
        adquisiciones_intra.push(entry);
      } else {
        entregas_intra.push(entry);
      }
    }
  }

  const total = [...entregas_intra, ...adquisiciones_intra].reduce((s, e) => s + e.base, 0);

  return { entregas_intra, adquisiciones_intra, total_operaciones: round2(total) };
}

// GET
export async function GET(req) {
  try {
    const tenantId = getTenantId(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'operations') {
      const data = await getOperationsData(tenantId);
      return NextResponse.json(data);
    }

    if (action === 'settings') {
      const rows = await sql`SELECT key, value FROM gestoria_settings WHERE tenant_id = ${tenantId}`;
      const s = {};
      for (const r of rows) s[r.key] = r.value;
      return NextResponse.json(s);
    }

    if (action === 'documents') {
      const type = searchParams.get('type') || 'expense';
      const docs = await sql`
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
      `;
      return NextResponse.json(docs);
    }

    if (action === 'payrolls') {
      const rows = await sql`SELECT * FROM gestoria_payrolls WHERE tenant_id = ${tenantId} ORDER BY year DESC, month DESC, created_at DESC`;
      const mapped = rows.map(r => ({
        id: r.id, employeeName: r.employee_name, employeeNif: r.employee_nif,
        month: r.month, year: r.year, grossAmount: Number(r.gross_amount),
        irpfWithholding: Number(r.irpf_withholding),
        ssWorker: Number(r.social_security_worker),
        ssCompany: Number(r.social_security_company),
        netAmount: Number(r.net_amount), notes: r.notes, createdAt: r.created_at,
      }));
      return NextResponse.json(mapped);
    }

    if (action === 'taxmodels') {
      const rows = await sql`SELECT * FROM gestoria_tax_models WHERE tenant_id = ${tenantId} ORDER BY year DESC, model_code, quarter`;
      return NextResponse.json(rows.map(r => ({
        ...r, data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
      })));
    }

    if (action === 'authorization') {
      const rows = await sql`SELECT * FROM gestoria_authorization WHERE id = 1 AND tenant_id = ${tenantId}`;
      return NextResponse.json(rows[0] || null);
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create document, payroll, or calculate tax model
export async function POST(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    // Validate request payload using Zod schemas
    try {
      validateRequest(body);
    } catch (e) {
      return NextResponse.json({ error: e.errors || e.message }, { status: 400 });
    }
    const { action } = body;

    if (action === 'document') {
      const doc = body.document;
      const id = doc.id || makeId();
      await sql`
        INSERT INTO gestoria_documents (id, type, file_name, provider_name, provider_nif, document_date, confirmed, is_periodic, notes, created_at, tenant_id)
        VALUES (${id}, ${doc.type}, ${doc.fileName || ''}, ${doc.providerName || ''}, ${doc.providerNif || ''}, ${doc.documentDate || ''}, ${doc.confirmed || false}, ${doc.isPeriodic || false}, ${doc.notes || ''}, ${Date.now()}, ${tenantId})
      `;
      if (doc.lines && doc.lines.length > 0) {
        for (let i = 0; i < doc.lines.length; i++) {
          const l = doc.lines[i];
          const lid = l.id || makeId();
          await sql`
            INSERT INTO gestoria_document_lines (id, document_id, description, category, base_amount, vat_rate, vat_amount, withholding, zone, type, sort_order, tenant_id)
            VALUES (${lid}, ${id}, ${l.description}, ${l.category || ''}, ${l.baseAmount}, ${l.vatRate}, ${l.vatAmount}, ${l.withholding || 0}, ${l.zone || 'spain'}, ${l.type || 'good'}, ${i}, ${tenantId})
          `;
        }
      }
      return NextResponse.json({ ok: true, id });
    }

    if (action === 'payroll') {
      const p = body.payroll;
      const id = p.id || makeId();
      await sql`
        INSERT INTO gestoria_payrolls (id, employee_name, employee_nif, month, year, gross_amount, irpf_withholding, social_security_worker, social_security_company, net_amount, notes, created_at, tenant_id)
        VALUES (${id}, ${p.employeeName}, ${p.employeeNif}, ${p.month}, ${p.year}, ${p.grossAmount}, ${p.irpfWithholding}, ${p.ssWorker}, ${p.ssCompany}, ${p.netAmount}, ${p.notes || ''}, ${Date.now()}, ${tenantId})
        ON CONFLICT (id) DO UPDATE SET
          employee_name = EXCLUDED.employee_name, employee_nif = EXCLUDED.employee_nif,
          month = EXCLUDED.month, year = EXCLUDED.year,
          gross_amount = EXCLUDED.gross_amount, irpf_withholding = EXCLUDED.irpf_withholding,
          social_security_worker = EXCLUDED.social_security_worker,
          social_security_company = EXCLUDED.social_security_company,
          net_amount = EXCLUDED.net_amount, notes = EXCLUDED.notes
      `;
      return NextResponse.json({ ok: true, id });
    }

    if (action === 'calculate') {
      const { modelCode, year, quarter } = body;
      const data = await calculateTaxModelDraft(modelCode, year, quarter, tenantId);
      const existing = await sql`
        SELECT id FROM gestoria_tax_models WHERE model_code = ${modelCode} AND year = ${year} AND quarter = ${quarter} AND tenant_id = ${tenantId}
      `;
      if (existing.length > 0) {
        await sql`
          UPDATE gestoria_tax_models SET data = ${JSON.stringify(data)}, updated_at = ${Date.now()}, status = 'draft'
          WHERE id = ${existing[0].id} AND tenant_id = ${tenantId}
        `;
        return NextResponse.json({ ok: true, id: existing[0].id, data });
      } else {
        const id = makeId();
        await sql`
          INSERT INTO gestoria_tax_models (id, model_code, year, quarter, status, data, due_date, created_at, updated_at, tenant_id)
          VALUES (${id}, ${modelCode}, ${year}, ${quarter}, 'draft', ${JSON.stringify(data)}, ${getDueDate(modelCode, year, quarter)}, ${Date.now()}, ${Date.now()}, ${tenantId})
        `;
        return NextResponse.json({ ok: true, id, data });
      }
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — settings, confirm, status, authorization
export async function PUT(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    // Validate request payload using Zod schemas
    try {
      validateRequest(body);
    } catch (e) {
      return NextResponse.json({ error: e.errors || e.message }, { status: 400 });
    }
    const { action } = body;

    if (action === 'settings') {
      for (const [key, value] of Object.entries(body.settings)) {
        await sql`INSERT INTO gestoria_settings (key, value, tenant_id) VALUES (${key}, ${String(value)}, ${tenantId}) ON CONFLICT (key, tenant_id) DO UPDATE SET value = EXCLUDED.value`;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'confirm') {
      await sql`UPDATE gestoria_documents SET confirmed = NOT confirmed WHERE id = ${body.id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'status') {
      await sql`UPDATE gestoria_tax_models SET status = ${body.status}, updated_at = ${Date.now()} WHERE id = ${body.id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'authorization') {
      const { name, nif, signedAt, socialRed, revoke } = body;
      if (revoke) {
        await sql`UPDATE gestoria_authorization SET revoked = true, revoked_at = ${Date.now()} WHERE id = 1 AND tenant_id = ${tenantId}`;
      } else {
        await sql`
          UPDATE gestoria_authorization SET
            accountant_name = ${name || ''}, accountant_nif = ${nif || ''},
            signed_at = ${signedAt || Date.now()}, social_security_red = ${socialRed || false},
            revoked = false, revoked_at = NULL
          WHERE id = 1 AND tenant_id = ${tenantId}
        `;
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req) {
  try {
    const tenantId = getTenantId(req);
    const body = await req.json();
    // Validate request payload for delete actions
    try {
      ConfirmSchema.parse(body);
    } catch (e) {
      return NextResponse.json({ error: e.errors || e.message }, { status: 400 });
    }
    const { action, id } = body;
    if (action === 'document') {
      await sql`DELETE FROM gestoria_documents WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }
    if (action === 'payroll') {
      await sql`DELETE FROM gestoria_payrolls WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- Helpers ---

function getDueDate(modelCode, year, quarter) {
  if (['390','190','180'].includes(modelCode)) return `${year + 1}-01-31`;
  const deadlines = { 1: '04-20', 2: '07-20', 3: '10-20', 4: '01-30' };
  const dd = deadlines[quarter] || '01-30';
  const y = quarter === 4 ? year + 1 : year;
  return `${y}-${dd}`;
}

async function calculateTaxModelDraft(modelCode, year, quarter, tenantId) {
  const qStart = quarterStartDate(year, quarter);
  const qEnd = quarterEndDate(year, quarter);

  // Fetch sales in period
  const sales = await sql`
    SELECT * FROM sales WHERE closed_at >= ${qStart} AND closed_at <= ${qEnd} AND tenant_id = ${tenantId} ORDER BY closed_at
  `;
  const confirmedDocs = await sql`
    SELECT d.*, (SELECT json_agg(l.*) FROM gestoria_document_lines l WHERE l.document_id = d.id) as lines
    FROM gestoria_documents d WHERE d.confirmed = true AND d.tenant_id = ${tenantId} AND d.created_at >= ${qStart} AND d.created_at <= ${qEnd}
  `;

  const salesTotal = sales.reduce((s, r) => s + Number(r.total || 0), 0);
  const salesVat = salesTotal * 0.21; // simplified 21% IVA
  const expenseTotal = confirmedDocs.reduce((s, d) => {
    const lines = typeof d.lines === 'string' ? JSON.parse(d.lines) : (d.lines || []);
    return s + lines.reduce((sl, l) => sl + Number(l.base_amount || 0), 0);
  }, 0);
  const expenseVat = confirmedDocs.reduce((s, d) => {
    const lines = typeof d.lines === 'string' ? JSON.parse(d.lines) : (d.lines || []);
    return s + lines.reduce((sl, l) => sl + Number(l.vat_amount || 0), 0);
  }, 0);

  // Get payrolls in period
  const payrolls = await sql`
    SELECT * FROM gestoria_payrolls WHERE tenant_id = ${tenantId} AND year = ${year} AND (
      (${quarter} = 1 AND month >= 1 AND month <= 3) OR
      (${quarter} = 2 AND month >= 4 AND month <= 6) OR
      (${quarter} = 3 AND month >= 7 AND month <= 9) OR
      (${quarter} = 4 AND month >= 10 AND month <= 12)
    )
  `;

  const totalIrpfWithholding = payrolls.reduce((s, p) => s + Number(p.irpf_withholding || 0), 0);
  const totalSsCompany = payrolls.reduce((s, p) => s + Number(p.social_security_company || 0), 0);

  switch (modelCode) {
    case '303': {
      const euSales = salesTotal * 0.01; // simplified: 1% EU sales
      const euPurchases = confirmedDocs.reduce((s, d) => {
        const lines = typeof d.lines === 'string' ? JSON.parse(d.lines) : (d.lines || []);
        return s + lines.filter(l => l.zone === 'eu').reduce((sl, l) => sl + Number(l.base_amount || 0), 0);
      }, 0);
      return {
        casilla_01: round2(salesTotal),          // Base imponible general
        casilla_03: round2(salesVat),            // IVA devengado 21%
        casilla_07: round2(euSales),             // IVA devengado EU
        casilla_08: round2(salesTotal + euSales), // Total IVA devengado
        casilla_09: round2(expenseTotal),        // Base imponible deducible
        casilla_11: round2(expenseVat),          // IVA deducible
        casilla_13: round2(euPurchases),         // IVA deducible EU
        casilla_14: round2(expenseVat + euPurchases), // Total IVA deducible
        resultado: round2(salesVat + euSales - expenseVat - euPurchases),
      };
    }
    case '130': {
      const income = salesTotal;
      const expenses = expenseTotal + totalSsCompany;
      const netIncome = income - expenses;
      const taxBase = netIncome > 0 ? netIncome : 0;
      const withholding = totalIrpfWithholding;
      return {
        ingresos: round2(income),
        gastos: round2(expenses),
        rendimiento: round2(netIncome),
        base_imponible: round2(taxBase),
        cuota_integra: round2(taxBase * 0.20),
        retenciones: round2(withholding),
        resultado: round2(taxBase * 0.20 - withholding),
      };
    }
    case '111': {
      const workWithholding = totalIrpfWithholding;
      return {
        trabajadores: payrolls.length,
        total_remuneraciones: round2(payrolls.reduce((s, p) => s + Number(p.gross_amount || 0), 0)),
        retencion_trabajo: round2(workWithholding),
        retencion_profesionales: 0,
        total_retenciones: round2(workWithholding),
      };
    }
    case '115': {
      // Simplified: rental withholding not implemented yet
      return {
        alquileres: 0,
        base_retencion: 0,
        retencion_ingresada: 0,
        nota: 'No hay alquileres registrados',
      };
    }
    case '349': {
      const euDocs = confirmedDocs.reduce((acc, d) => {
        const lines = typeof d.lines === 'string' ? JSON.parse(d.lines) : (d.lines || []);
        const euLines = lines.filter(l => l.zone === 'eu');
        return acc.concat(euLines.map(l => ({
          nif: d.provider_nif || '',
          name: d.provider_name || d.file_name || '',
          base: Number(l.base_amount || 0),
          operacion: l.type === 'service' ? 'servicio' : 'bien',
        })));
      }, []);
      return {
        entregas_intra: [],
        adquisiciones_intra: euDocs,
        total_operaciones: round2(euDocs.reduce((s, e) => s + e.base, 0)),
      };
    }
    case '347': {
      const providers = confirmedDocs.reduce((acc, d) => {
        if (!d.provider_nif) return acc;
        const base = (() => {
          const lines = typeof d.lines === 'string' ? JSON.parse(d.lines) : (d.lines || []);
          return lines.reduce((s, l) => s + Number(l.base_amount || 0), 0);
        })();
        if (base < 3005.06) return acc;
        const key = d.provider_nif;
        if (!acc[key]) acc[key] = { nif: d.provider_nif, name: d.provider_name || '', total: 0, operations: 0 };
        acc[key].total += base;
        acc[key].operations++;
        return acc;
      }, {});
      return { operaciones: Object.values(providers), nota: 'Solo operaciones > 3.005,06€' };
    }
    case '390': {
      const q1 = await calculateTaxModelDraft('303', year, 1, tenantId);
      const q2 = await calculateTaxModelDraft('303', year, 2, tenantId);
      const q3 = await calculateTaxModelDraft('303', year, 3, tenantId);
      const q4 = await calculateTaxModelDraft('303', year, 4, tenantId);
      return {
        anual: true,
        base_imponible: round2(Number(q1.casilla_01 || 0) + Number(q2.casilla_01 || 0) + Number(q3.casilla_01 || 0) + Number(q4.casilla_01 || 0)),
        iva_devengado: round2(Number(q1.casilla_03 || 0) + Number(q2.casilla_03 || 0) + Number(q3.casilla_03 || 0) + Number(q4.casilla_03 || 0)),
        iva_deducible: round2(Number(q1.casilla_11 || 0) + Number(q2.casilla_11 || 0) + Number(q3.casilla_11 || 0) + Number(q4.casilla_11 || 0)),
        resultado: round2(
          Number(q1.resultado || 0) + Number(q2.resultado || 0) + Number(q3.resultado || 0) + Number(q4.resultado || 0)
        ),
        trimestres: [q1, q2, q3, q4],
      };
    }
    case '190': {
      return {
        anual: true,
        empleados: payrolls.length,
        total_remuneraciones: round2(payrolls.reduce((s, p) => s + Number(p.gross_amount || 0), 0)),
        retenciones: round2(payrolls.reduce((s, p) => s + Number(p.irpf_withholding || 0), 0)),
      };
    }
    case '180': {
      return {
        anual: true,
        alquileres: 0,
        retencion_ingresada: 0,
        nota: 'No hay alquileres registrados',
      };
    }
    default:
      return { nota: `Modelo ${modelCode} no implementado` };
  }
}

function quarterStartDate(year, quarter) {
  const months = { 1: 1, 2: 4, 3: 7, 4: 10 };
  return new Date(year, months[quarter] - 1, 1).getTime();
}
function quarterEndDate(year, quarter) {
  const months = { 1: 3, 2: 6, 3: 9, 4: 12 };
  return new Date(year, months[quarter], 0, 23, 59, 59, 999).getTime();
}
function round2(n) { return Math.round(Number(n) * 100) / 100; }
