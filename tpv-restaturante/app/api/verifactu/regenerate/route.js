import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { registerSaleInFiskaly } from '../../../../lib/fiskaly';
import { generateRegistroFactura } from '../../../../lib/verifactu';

export async function POST(req) {
  try {
    // 1. Obtener todas las ventas
    const sales = await sql`
      SELECT * FROM sales ORDER BY closed_at ASC
    `;

    if (sales.length === 0) {
      return NextResponse.json({ error: 'No hay ventas para regenerar' }, { status: 400 });
    }

    // 2. Borrar todos los registros Verifactu existentes
    await sql`DELETE FROM verifactu_registros`;

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
        
        // Manejar fecha correctamente
        const closedAt = sale.closed_at ? new Date(Number(sale.closed_at)) : new Date();
        const fechaExpedicion = closedAt.toISOString().slice(0, 10);
        const now = Date.now();

        // Intentar registrar en Fiskaly
        let fiskalyInvoiceId = null;
        let verificationUrl = null;
        let qrUrl = null;
        let estado = 'pendiente';
        let hash = '0';
        let xml = '';

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
          qrUrl = fallback.qrUrl;
          estado = 'simulado';
        }

        // Guardar en base de datos
        const inserted = await sql`
          INSERT INTO verifactu_registros
            (sale_id, num_serie, fecha_expedicion, importe_total, base_imponible,
             cuota_iva, huella_anterior, huella, xml_registro, qr_url, estado, created_at,
             fiskaly_invoice_id, verification_url)
          VALUES (
            ${sale.id}, ${numSerie}, ${fechaExpedicion},
            ${importeTotal}, ${baseImponible}, ${cuotaIva},
            ${previousHash}, ${hash}, ${xml}, ${qrUrl || ''}, ${estado}, ${now},
            ${fiskalyInvoiceId}, ${verificationUrl}
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
