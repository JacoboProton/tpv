import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getTenantId } from '../../../../lib/tenant';
import { requireAdminPin } from '../../../../lib/rbac';
import { registerSaleInFiskaly } from '../../../../lib/fiskaly';
import { generateRegistroFactura, formatFecha } from '../../../../lib/verifactu';

export async function POST(req) {
  try {
    const body = await req.json();
    const adminCheck = await requireAdminPin(req, body.adminPin);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const tenantId = getTenantId(req);

    // 1a. Backup existing verifactu registros before deleting
    const existingRegs = await sql`
      SELECT * FROM verifactu_registros WHERE tenant_id = ${tenantId}
    `;
    if (existingRegs.length > 0) {
      const backupId = 'backup_verifactu_' + Date.now();
      await sql`
        INSERT INTO backups (id, data, created_at)
        VALUES (${backupId}, ${JSON.stringify(existingRegs)}, ${Date.now()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // 1. Obtener todas las ventas
    const sales = await sql`
      SELECT * FROM sales WHERE tenant_id = ${tenantId} ORDER BY closed_at ASC
    `;

    if (sales.length === 0) {
      return NextResponse.json({ error: 'No hay ventas para regenerar' }, { status: 400 });
    }

    // 2. Borrar todos los registros Verifactu existentes
    await sql`DELETE FROM verifactu_registros WHERE tenant_id = ${tenantId}`;

    // 3. Registrar cada venta de nuevo con el NIF correcto
    const results = [];
    let previousHash = '0';
    const year = new Date().getFullYear();

    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      try {
        // Generar número de serie
        const seq = i + 1;
        const numSerie = `VERI-${year}-${String(seq).padStart(6, '0')}`;

        // Calcular importes
        const total = Number(sale.total ?? sale.total_with_tip ?? 0);
        const importeTotal = Number(total.toFixed(2));
        const baseImponible = Number((importeTotal / 1.07).toFixed(2));
        const cuotaIva = Number((importeTotal - baseImponible).toFixed(2));
        
        // Manejar fecha correctamente (huso horario local de Canarias)
        const closedAt = sale.closed_at ? Number(sale.closed_at) : Date.now();
        const fechaExpedicion = formatFecha(closedAt);
        const now = Date.now();

        // Intentar registrar en Fiskaly
        let fiskalyInvoiceId = null;
        let verificationUrl = null;
        let qrUrl = null;
        let estado = 'pendiente';
        let hash = '0';
        let xml = '';
        let fechaHoraFirma = null;

        try {
          const fiskalyResult = await registerSaleInFiskaly(sale, numSerie);
          fiskalyInvoiceId = fiskalyResult.fiskalyInvoiceId;
          verificationUrl = fiskalyResult.verificationUrl;
          qrUrl = fiskalyResult.qrUrl;
          estado = 'registrado';

          // Adaptar objeto de DB al formato esperado por generateRegistroFactura
          const saleForVerifactu = {
            ...sale,
            closedAt: sale.closed_at ? Number(sale.closed_at) : Date.now(),
            totalWithTip: sale.total_with_tip ? Number(sale.total_with_tip) : Number(sale.total),
            total: sale.total ? Number(sale.total) : 0,
            tableName: sale.table_name,
            items: sale.items || [],
          };

          const localResult = generateRegistroFactura(saleForVerifactu, previousHash, numSerie);
          hash = localResult.hash;
          xml = localResult.xml;
          fechaHoraFirma = localResult.fechaHoraFirma;
          if (!qrUrl) qrUrl = localResult.qrUrl;
        } catch (fkErr) {
          console.error(`Fiskaly fallback a simulación local para venta ${sale.id}:`, fkErr.message);
          
          const saleForVerifactu = {
            ...sale,
            closedAt: sale.closed_at ? Number(sale.closed_at) : Date.now(),
            totalWithTip: sale.total_with_tip ? Number(sale.total_with_tip) : Number(sale.total),
            total: sale.total ? Number(sale.total) : 0,
            tableName: sale.table_name,
            items: sale.items || [],
          };
          
          const fallback = generateRegistroFactura(saleForVerifactu, previousHash, numSerie);
          hash = fallback.hash;
          xml = fallback.xml;
          fechaHoraFirma = fallback.fechaHoraFirma;
          qrUrl = fallback.qrUrl;
          estado = 'simulado';
        }

        // Guardar en base de datos
        const inserted = await sql`
          INSERT INTO verifactu_registros
            (sale_id, num_serie, fecha_expedicion, importe_total, base_imponible,
             cuota_iva, huella_anterior, huella, xml_registro, qr_url, estado, created_at,
             fiskaly_invoice_id, verification_url, fecha_hora_firma, payment_intent_id, tenant_id)
          VALUES (
            ${sale.id}, ${numSerie}, ${fechaExpedicion},
            ${importeTotal}, ${baseImponible}, ${cuotaIva},
            ${previousHash}, ${hash}, ${xml}, ${qrUrl || ''}, ${estado}, ${now},
            ${fiskalyInvoiceId}, ${verificationUrl}, ${fechaHoraFirma},
            ${sale.payment_intent_id ?? ''}, ${tenantId}
          )
          RETURNING *
        `;

        previousHash = hash;
        results.push({ saleId: sale.id, success: true, numSerie });
      } catch (err) {
        results.push({ saleId: sale.id, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      message: `Regenerados ${successCount}/${sales.length} registros Verifactu`,
      total: sales.length,
      success: successCount,
      failed: sales.length - successCount,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
