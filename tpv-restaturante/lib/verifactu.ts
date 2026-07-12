import { createHash } from 'crypto';

const NIF_EMISOR = process.env.FISKALY_TAXPAYER_NIF || 'B12345678';
const QR_BASE = 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR';

const IGIC_RATE = 0.07;
const IGIC_LABEL = '7.00';

export function formatFecha(ts: number | string | Date): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatHora(ts: number | string | Date): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mi}:${ss}`;
}

interface RegistroData {
  nif: string;
  numSerie: string;
  fechaExpedicion: string;
  tipoFactura: string;
  cuotaTotal: number;
  importeTotal: number;
  huellaAnterior: string;
  fechaHoraFirma: string;
}

export function computeHash(registroData: RegistroData): string {
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

export function buildQRUrl(nif: string, numSerie: string, fecha: string, importe: number): string {
  const params = new URLSearchParams({
    nif,
    numserie: numSerie,
    fecha,
    importe: Number(importe).toFixed(2),
  });
  return `${QR_BASE}?${params.toString()}`;
}

interface Sale {
  id?: string;
  saleId?: string;
  closedAt?: number | string | Date;
  total?: number;
  totalWithTip?: number;
  tableName?: string;
}

interface Overrides {
  fechaExpedicion?: string;
  importeTotal?: number;
  baseImponible?: number;
  cuotaIGIC?: number;
}

interface RegistroFacturaResult {
  xml: string;
  hash: string;
  qrUrl: string;
  registroData: RegistroData;
  fechaExpedicion: string;
  fechaHoraFirma: string;
}

export function generateRegistroFactura(
  sale: Sale,
  previousHash: string,
  numSerie: string,
  overrides: Overrides = {}
): RegistroFacturaResult {
  const ts = sale.closedAt ?? Date.now();
  const fechaExpedicion = overrides.fechaExpedicion ?? formatFecha(ts);
  const hora = formatHora(ts);
  const fechaHoraFirma = `${fechaExpedicion}T${hora}`;

  const importeTotal = overrides.importeTotal ?? Number((sale.totalWithTip ?? sale.total ?? 0).toFixed(2));
  const baseImponible = overrides.baseImponible ?? Number((importeTotal / (1 + IGIC_RATE)).toFixed(2));
  const cuotaIGIC = overrides.cuotaIGIC ?? Number((importeTotal - baseImponible).toFixed(2));

  const tipoFactura = 'F1';

  const registroData: RegistroData = {
    nif: NIF_EMISOR,
    numSerie,
    fechaExpedicion,
    tipoFactura,
    cuotaTotal: cuotaIGIC,
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
    previousHash: previousHash ?? '0',
    fechaHoraFirma,
    hash,
  });

  const qrUrl = buildQRUrl(NIF_EMISOR, numSerie, fechaExpedicion, importeTotal);

  return { xml, hash, qrUrl, registroData, fechaExpedicion, fechaHoraFirma };
}

function esc(str: string | number): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface XMLParams {
  nif: string;
  numSerie: string;
  fechaExpedicion: string;
  descripcion: string;
  importeTotal: number;
  baseImponible: number;
  cuotaIGIC: number;
  previousHash: string;
  fechaHoraFirma: string;
  hash: string;
}

function buildXML({
  nif, numSerie, fechaExpedicion, descripcion,
  importeTotal, baseImponible, cuotaIGIC,
  previousHash, fechaHoraFirma, hash,
}: XMLParams): string {
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
