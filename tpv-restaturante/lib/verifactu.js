/**
 * Módulo de simulación Verifactu (AEAT)
 * Implementa la cadena de huellas SHA-256 y la generación de XML/QR
 * según el esquema RegFactuSistemaFacturacion.
 *
 * Canarias — IGIC tipo general: 7% (en lugar de IVA 21%)
 * El impuesto se denomina IGIC y la etiqueta en el XML se adapta.
 */
import { createHash } from 'crypto';

const NIF_EMISOR    = process.env.FISKALY_TAXPAYER_NIF || 'B12345678';
const QR_BASE       = 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR';

// Tipo de IGIC general aplicable en Canarias
const IGIC_RATE     = 0.07;          // 7%
const IGIC_LABEL    = '7.00';        // como aparece en el XML

// ---------- Utilidades de fecha ----------

export function formatFecha(ts) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatHora(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mi}:${ss}`;
}

// ---------- Hash SHA-256 ----------

/**
 * Calcula la huella de un registro.
 * Concatenación:  NIF-EmisorFactura + NumSerieFactura + FechaExpedicionFacturaEmisor
 *                 + TipoFactura + CuotaTotal + ImporteTotal
 *                 + Huella_anterior + FechaHoraHusoHorarioFirma
 */
export function computeHash(registroData) {
  const {
    nif,
    numSerie,
    fechaExpedicion,
    tipoFactura,
    cuotaTotal,
    importeTotal,
    huellaAnterior,
    fechaHoraFirma,
  } = registroData;

  const cadena = [
    nif,
    numSerie,
    fechaExpedicion,
    tipoFactura,
    String(cuotaTotal),
    String(importeTotal),
    huellaAnterior,
    fechaHoraFirma,
  ].join('');

  return createHash('sha256').update(cadena, 'utf8').digest('hex');
}

// ---------- URL de QR ----------

export function buildQRUrl(nif, numSerie, fecha, importe) {
  const params = new URLSearchParams({
    nif,
    numserie: numSerie,
    fecha,
    importe: Number(importe).toFixed(2),
  });
  return `${QR_BASE}?${params.toString()}`;
}

// ---------- Generador principal ----------

/**
 * Genera todos los datos Verifactu para una venta.
 *
 * @param {Object} sale          - Objeto venta del TPV
 * @param {string} previousHash  - Huella del registro anterior (o '0' si es el primero)
 * @param {string} numSerie      - Número de serie asignado (ej: "VERI-2025-000001")
 * @returns {{ xml, hash, qrUrl, registroData }}
 */
export function generateRegistroFactura(sale, previousHash, numSerie, overrides = {}) {
  const ts              = sale.closedAt ?? Date.now();
  const fechaExpedicion = overrides.fechaExpedicion ?? formatFecha(ts);
  const hora            = formatHora(ts);
  const fechaHoraFirma  = `${fechaExpedicion}T${hora}`;

  // --- Cálculo IGIC (7% incluido en precio) ---
  // Precio total incluye IGIC → base = total / 1.07
  const importeTotal  = overrides.importeTotal ?? Number((sale.totalWithTip ?? sale.total ?? 0).toFixed(2));
  const baseImponible = overrides.baseImponible ?? Number((importeTotal / (1 + IGIC_RATE)).toFixed(2));
  const cuotaIGIC     = overrides.cuotaIGIC ?? Number((importeTotal - baseImponible).toFixed(2));

  const tipoFactura = 'F1'; // Factura normal

  const registroData = {
    nif:            NIF_EMISOR,
    numSerie,
    fechaExpedicion,
    tipoFactura,
    cuotaTotal:     cuotaIGIC,
    importeTotal,
    huellaAnterior: previousHash ?? '0',
    fechaHoraFirma,
  };

  const hash = computeHash(registroData);

  const descripcion = sale.tableName
    ? `Venta mesa ${sale.tableName}`
    : `Venta TPV ${sale.id || sale.saleId || ''}`;

  const xml = buildXML({
    nif: NIF_EMISOR,
    numSerie,
    fechaExpedicion,
    descripcion,
    importeTotal,
    baseImponible,
    cuotaIGIC,
    previousHash:  previousHash ?? '0',
    fechaHoraFirma,
    hash,
  });

  const qrUrl = buildQRUrl(NIF_EMISOR, numSerie, fechaExpedicion, importeTotal);

  // fechaHoraFirma se expone aparte para que los callers la persistan y la
  // reutilicen al verificar (es uno de los 8 campos del hash y no se debe
  // recalcular nunca).
  return { xml, hash, qrUrl, registroData, fechaExpedicion, fechaHoraFirma };
}

// ---------- Constructor de XML ----------

function esc(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/**
 * Genera el XML Verifactu con IGIC (Canarias).
 * Se usa TipoDesgloseIGIC en lugar de TipoDesgloseIVA,
 * y el tipo impositivo es 7.00.
 */
function buildXML({
  nif, numSerie, fechaExpedicion, descripcion,
  importeTotal, baseImponible, cuotaIGIC,
  previousHash, fechaHoraFirma, hash,
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RegFactuSistemaFacturacion>
  <IDVersion>1.0</IDVersion>
  <RegistroFactura>
    <RegistroAlta>
      <IDFactura>
        <IDEmisorFactura>${esc(nif)}</IDEmisorFactura>
        <NumSerieFactura>${esc(numSerie)}</NumSerieFactura>
        <FechaExpedicionFacturaEmisor>${esc(fechaExpedicion)}</FechaExpedicionFacturaEmisor>
      </IDFactura>
      <DatosFactura>
        <FechaOperacion>${esc(fechaExpedicion)}</FechaOperacion>
        <DescripcionOperacion>${esc(descripcion)}</DescripcionOperacion>
        <ImporteTotal>${importeTotal.toFixed(2)}</ImporteTotal>
        <TipoDesgloseIGIC>
          <DetalleIGIC>
            <TipoImpositivo>${IGIC_LABEL}</TipoImpositivo>
            <BaseImponible>${baseImponible.toFixed(2)}</BaseImponible>
            <CuotaRepercutida>${cuotaIGIC.toFixed(2)}</CuotaRepercutida>
          </DetalleIGIC>
        </TipoDesgloseIGIC>
      </DatosFactura>
      <HuellaRegistroAnterior>${esc(previousHash)}</HuellaRegistroAnterior>
      <FechaHoraHusoHorarioFirma>${esc(fechaHoraFirma)}</FechaHoraHusoHorarioFirma>
      <Huella>${esc(hash)}</Huella>
    </RegistroAlta>
  </RegistroFactura>
</RegFactuSistemaFacturacion>`;
}
