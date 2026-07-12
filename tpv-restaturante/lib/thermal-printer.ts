import iconv from 'iconv-lite';

declare global {
  interface Navigator {
    usb?: {
      requestDevice: (options: { filters: unknown[] }) => Promise<{
        open: () => Promise<void>;
        selectConfiguration: (n: number) => Promise<void>;
        claimInterface: (n: number) => Promise<void>;
        transferOut: (endpoint: number, data: Uint8Array) => Promise<{ status: string; bytesWritten: number }>;
        close: () => Promise<void>;
      }>;
    };
  }
}

export function escposInit(): Uint8Array {
  return new Uint8Array([0x1b, 0x40]);
}

export function escposCenter(): Uint8Array {
  return new Uint8Array([0x1b, 0x61, 0x01]);
}

export function escposLeft(): Uint8Array {
  return new Uint8Array([0x1b, 0x61, 0x00]);
}

export function escposBold(on: boolean): Uint8Array {
  return new Uint8Array([0x1b, 0x45, on ? 1 : 0]);
}

export function escposDoubleHeight(on: boolean): Uint8Array {
  return new Uint8Array([0x1d, 0x21, on ? 0x11 : 0x00]);
}

export function escposCut(): Uint8Array {
  return new Uint8Array([0x1d, 0x56, 0x00]);
}

export function escposLine(n = 1): Uint8Array {
  return new Uint8Array(Array(n).fill(0x0a));
}

export function escposText(text: string, encoding = 'windows-1252'): Uint8Array {
  const buf = iconv.encode(text + '\n', encoding);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function escposSeparator(char = '-', width = 32): Uint8Array {
  const line = char.repeat(width) + '\n';
  return new TextEncoder().encode(line);
}

function encodeWin(text: string): Uint8Array {
  const buf = iconv.encode(text, 'windows-1252');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

interface TicketItem {
  name: string;
  qty: number;
  price: number;
  modifiers?: Array<{ optionName: string }>;
}

interface TicketTotals {
  total: number;
  discount?: number;
  discountAmount?: number;
  tip?: number;
  verifactuNum?: string;
}

interface Restaurant {
  name?: string;
  cif?: string;
}

interface GenerateTicketDataParams {
  restaurant?: string | Restaurant;
  table?: string;
  items: TicketItem[];
  totals: TicketTotals;
  date?: string;
}

export function generateTicketData({ restaurant, table, items, totals, date }: GenerateTicketDataParams): Uint8Array {
  const chunks: Uint8Array[] = [];

  function add(arr: Uint8Array) { chunks.push(arr); }

  add(escposInit());
  add(escposCenter());
  add(escposDoubleHeight(true));
  add(escposBold(true));

  const restName = typeof restaurant === 'string' ? restaurant : (restaurant?.name || 'LA COMANDA');
  add(encodeWin(restName + '\n'));
  add(escposBold(false));
  add(escposDoubleHeight(false));
  add(escposCenter());

  const restCif = typeof restaurant === 'object' && restaurant ? (restaurant.cif || '78406450W') : '78406450W';
  add(encodeWin('CIF: ' + restCif + '\n'));
  add(encodeWin(date ? date : new Date().toLocaleString('es-ES') + '\n\n'));
  add(escposLeft());

  add(encodeWin('Mesa: ' + (table || '') + '\n'));
  add(escposSeparator('-'));

  items.forEach(item => {
    add(escposBold(true));
    add(encodeWin(item.name + '\n'));
    add(escposBold(false));
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(m => {
        add(encodeWin('  + ' + m.optionName + '\n'));
      });
    }
    add(encodeWin('   ' + item.qty + ' x ' + item.price.toFixed(2) + '€'));
    add(encodeWin('   ' + (item.qty * item.price).toFixed(2) + '€\n'));
  });

  add(escposSeparator('='));
  add(escposBold(true));
  add(encodeWin('TOTAL: ' + totals.total.toFixed(2) + '€\n'));
  add(escposBold(false));

  if (totals.discount && totals.discount > 0 && totals.discountAmount) {
    add(encodeWin('Dto: ' + totals.discount + '%  -' + totals.discountAmount.toFixed(2) + '€\n'));
  }
  if (totals.tip && totals.tip > 0) {
    add(encodeWin('Propina: +' + totals.tip.toFixed(2) + '€\n'));
  }

  add(escposSeparator('-'));
  add(escposCenter());
  add(encodeWin('Gracias por su visita\n'));
  add(encodeWin('Verifactu: ' + (totals.verifactuNum || '—') + '\n'));
  add(escposLine(3));
  add(escposCut());

  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

interface PrinterDevice {
  transferOut: (endpoint: number, data: Uint8Array) => Promise<{ status: string; bytesWritten: number }>;
  close: () => Promise<void>;
}

let printerDevice: PrinterDevice | null = null;

export function webUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

export async function connectPrinter(): Promise<boolean> {
  if (!webUsbSupported()) throw new Error('WebUSB no está disponible en este navegador. Usa Chrome o Edge con HTTPS.');
  try {
    const device = await navigator.usb!.requestDevice({ filters: [] });
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);
    printerDevice = device;
    return true;
  } catch (err) {
    if ((err as Error).name === 'NotFoundError') return false;
    throw err;
  }
}

export async function printESCPOS(data: Uint8Array): Promise<void> {
  if (!printerDevice) throw new Error('No hay impresora conectada');
  await printerDevice.transferOut(1, data);
}

export function escposOpenDrawer(): Uint8Array {
  return new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
}

export async function disconnectPrinter(): Promise<void> {
  if (printerDevice) {
    try { await printerDevice.close(); } catch { /* ignore */ }
    printerDevice = null;
  }
}

export function isPrinterConnected(): boolean {
  return printerDevice !== null;
}
