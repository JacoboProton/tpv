import type { Authorization } from './types';

export function generateModelPDF(code: string, data: Record<string, unknown>, year: number, quarter: number) {
  const quarterLabel = quarter > 0 ? `${quarter}º trimestre` : 'Resumen anual';
  const title = `Modelo ${code} — ${year} ${quarterLabel}`;
  const rows = Object.entries(data || {}).filter(([k]) => !['anual', 'trimestres', 'nota'].includes(k));
  const nota = data?.nota || '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; padding: 0; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #222; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 3px 0; font-size: 12px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f0f0f0; padding: 6px 8px; text-align: left; font-size: 10px; border: 1px solid #ccc; }
    td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
    .r { text-align: right; }
    .result { font-weight: bold; background: #f5f5f5; }
    .nota { margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 10px; }
    .footer { margin-top: 30px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
  </style></head><body>
    <div class="header">
      <h1>Modelo ${code}</h1>
      <p><strong>${title}</strong></p>
      <p>Borrador — Revisado y presentado por tu gestoría</p>
    </div>
    <table>
      <tr><th>Casilla</th><th>Importe</th></tr>
      ${rows.map(([k, v]) => {
        const label = formatFieldName(k);
        const val = typeof v === 'number' ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v) : String(v);
        return `<tr${k.startsWith('resultado') ? ' class="result"' : ''}><td>${label}</td><td class="r">${val}</td></tr>`;
      }).join('\n')}
    </table>
    ${(nota as string) ? `<div class="nota">⚠️ ${nota}</div>` : ''}
    <div class="footer">
      Mesero · Borrador informativo · Tu gestoría revisa y presenta ante la AEAT<br>
      Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </div>
  </body></html>`;
}

export function generateModelCSV(code: string, data: Record<string, unknown>) {
  const rows = Object.entries(data || {}).filter(([k]) => !['anual', 'trimestres', 'nota'].includes(k));
  return ['casilla,valor', ...rows.map(([k, v]) => `${k},${typeof v === 'number' ? v.toFixed(2) : String(v)}`)].join('\n');
}

export function generateAuthorizationPDF(auth: Authorization) {
  if (!auth) return '<html><body>No hay autorización</body></html>';
  const d = new Date(auth.signed_at);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 20mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; line-height: 1.6; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 30px; }
    .content { max-width: 500px; margin: 0 auto; }
    .signature { margin-top: 40px; }
    .footer { margin-top: 40px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
    table { width: 100%; margin: 15px 0; }
    td { padding: 4px 8px; }
    .label { font-weight: bold; width: 140px; }
  </style></head><body>
    <h1>Mandato de Colaboración Social</h1>
    <div class="content">
      <p>Por el presente documento, el contribuyente autoriza a su gestoría a presentar declaraciones tributarias y realizar trámites ante la Administración.</p>
      <table>
        <tr><td class="label">Gestoría:</td><td>${auth.accountant_name || '—'}</td></tr>
        <tr><td class="label">NIF Gestoría:</td><td>${auth.accountant_nif || '—'}</td></tr>
        <tr><td class="label">Fecha firma:</td><td>${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
        <tr><td class="label">Seguridad Social RED:</td><td>${auth.social_security_red ? 'Sí ✓' : 'No'}</td></tr>
        <tr><td class="label">Estado:</td><td>${auth.revoked ? 'REVOCADO' : 'Activo'}</td></tr>
      </table>
      <div class="signature"><div style="margin-top:20px; border-top: 1px solid #222; padding-top: 5px;">Firma del contribuyente</div></div>
    </div>
    <div class="footer">Mesero · Documento generado el ${new Date().toLocaleDateString('es-ES')}</div>
  </body></html>`;
}

export function formatFieldName(key: string) {
  const map: Record<string, string> = {
    casilla_01: 'Base imponible general', casilla_03: 'IVA devengado 21%',
    casilla_07: 'IVA devengado UE', casilla_08: 'Total IVA devengado',
    casilla_09: 'Base imponible deducible', casilla_11: 'IVA deducible',
    casilla_13: 'IVA deducible UE', casilla_14: 'Total IVA deducible',
    resultado: 'Resultado (a ingresar / a devolver)',
    ingresos: 'Ingresos computables', gastos: 'Gastos deducibles',
    rendimiento: 'Rendimiento neto', base_imponible: 'Base imponible',
    cuota_integra: 'Cuota íntegra (20%)', retenciones: 'Retenciones soportadas',
    trabajadores: 'Nº trabajadores', total_remuneraciones: 'Total remuneraciones',
    retencion_trabajo: 'Retención IRPF trabajo', retencion_profesionales: 'Retención IRPF profesionales',
    total_retenciones: 'Total retenciones ingresadas',
    alquileres: 'Nº alquileres', base_retencion: 'Base de retención',
    retencion_ingresada: 'Retención ingresada',
    entregas_intra: 'Entregas intracomunitarias', adquisiciones_intra: 'Adquisiciones intracomunitarias',
    total_operaciones: 'Total operaciones', nota: 'Nota',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function round2(n: number) { return Math.round(Number(n) * 100) / 100; }
