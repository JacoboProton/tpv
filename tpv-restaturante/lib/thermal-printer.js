export function escposInit() {
  return new Uint8Array([0x1b, 0x40]); // ESC @
}

export function escposCenter() {
  return new Uint8Array([0x1b, 0x61, 0x01]); // ESC a 1
}

export function escposLeft() {
  return new Uint8Array([0x1b, 0x61, 0x00]); // ESC a 0
}

export function escposBold(on) {
  return new Uint8Array([0x1b, 0x45, on ? 1 : 0]); // ESC E n
}

export function escposDoubleHeight(on) {
  return new Uint8Array([0x1d, 0x21, on ? 0x11 : 0x00]); // GS ! n
}

export function escposCut() {
  return new Uint8Array([0x1d, 0x56, 0x00]); // GS V 0
}

export function escposLine(n = 1) {
  return new Uint8Array(Array(n).fill(0x0a)); // LF
}

export function escposText(text, encoding = 'windows-1252') {
  const encoder = new TextEncoder(encoding);
  return encoder.encode(text + '\n');
}

export function escposSeparator(char = '-', width = 32) {
  const line = char.repeat(width) + '\n';
  return new TextEncoder().encode(line);
}

export function generateTicketData({ restaurant, table, items, totals, date }) {
  const chunks = [];

  function add(arr) { chunks.push(arr); }

  add(escposInit());
  add(escposCenter());
  add(escposDoubleHeight(true));
  add(escposBold(true));
  add(new TextEncoder().encode((restaurant || 'LA COMANDA') + '\n'));
  add(escposBold(false));
  add(escposDoubleHeight(false));
  add(escposCenter());
  add(new TextEncoder().encode('CIF: ' + (restaurant?.cif || '78406450W') + '\n'));
  add(new TextEncoder().encode(date ? date : new Date().toLocaleString('es-ES') + '\n\n'));
  add(escposLeft());

  add(new TextEncoder().encode('Mesa: ' + (table || '') + '\n'));
  add(escposSeparator('-'));

  items.forEach(item => {
    add(escposBold(true));
    add(new TextEncoder().encode(item.name + '\n'));
    add(escposBold(false));
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(m => {
        add(new TextEncoder().encode('  + ' + m.optionName + '\n'));
      });
    }
    add(new TextEncoder().encode('   ' + item.qty + ' x ' + item.price.toFixed(2) + '€'));
    add(new TextEncoder().encode('   ' + (item.qty * item.price).toFixed(2) + '€\n'));
  });

  add(escposSeparator('='));
  add(escposBold(true));
  add(new TextEncoder().encode('TOTAL: ' + totals.total.toFixed(2) + '€\n'));
  add(escposBold(false));

  if (totals.discount > 0) {
    add(new TextEncoder().encode('Dto: ' + totals.discount + '%  -' + totals.discountAmount.toFixed(2) + '€\n'));
  }
  if (totals.tip > 0) {
    add(new TextEncoder().encode('Propina: +' + totals.tip.toFixed(2) + '€\n'));
  }

  add(escposSeparator('-'));
  add(escposCenter());
  add(new TextEncoder().encode('Gracias por su visita\n'));
  add(new TextEncoder().encode('Verifactu: ' + (totals.verifactuNum || '—') + '\n'));
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

let printerDevice = null;

export function webUsbSupported() {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

export async function connectPrinter() {
  if (!webUsbSupported()) throw new Error('WebUSB no está disponible en este navegador. Usa Chrome o Edge con HTTPS.');
  try {
    const device = await navigator.usb.requestDevice({ filters: [] });
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);
    printerDevice = device;
    return true;
  } catch (err) {
    if (err.name === 'NotFoundError') return false;
    throw err;
  }
}

export async function printESCPOS(data) {
  if (!printerDevice) throw new Error('No hay impresora conectada');
  await printerDevice.transferOut(1, data);
}

export function escposOpenDrawer() {
  return new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
}

export async function disconnectPrinter() {
  if (printerDevice) {
    try { await printerDevice.close(); } catch {}
    printerDevice = null;
  }
}

export function isPrinterConnected() {
  return printerDevice !== null;
}
