import type { OrderItem, Product } from './types';

export const ALLERGENS = [
  { id: 'gluten', label: 'Gluten', abbr: 'G' },
  { id: 'crustaceos', label: 'Crustáceos', abbr: 'C' },
  { id: 'huevos', label: 'Huevos', abbr: 'H' },
  { id: 'pescado', label: 'Pescado', abbr: 'P' },
  { id: 'cacahuetes', label: 'Cacahuetes', abbr: 'Cn' },
  { id: 'soja', label: 'Soja', abbr: 'S' },
  { id: 'lacteos', label: 'Lácteos', abbr: 'L' },
  { id: 'frutos_secos', label: 'Frutos secos', abbr: 'Fs' },
  { id: 'apio', label: 'Apio', abbr: 'A' },
  { id: 'mostaza', label: 'Mostaza', abbr: 'M' },
  { id: 'sesamo', label: 'Sésamo', abbr: 'Ss' },
  { id: 'sulfitos', label: 'Sulfitos', abbr: 'Su' },
  { id: 'altramuces', label: 'Altramuces', abbr: 'Al' },
  { id: 'moluscos', label: 'Moluscos', abbr: 'Mo' },
];

interface BuildTicketParams {
  restaurantName?: string;
  companyCif?: string;
  companyAddress?: string;
  companyPhone?: string;
  logoUrl?: string;
  footerText?: string;
  ticketWidth?: string;
  tableName?: string;
  employeeName?: string;
  ticketNumber?: number;
  verifactuNum?: string;
  date?: string;
  items: OrderItem[];
  catalogProducts?: Product[];
  subtotal: number;
  discountAmount: number;
  tip: number;
  tipMethod?: string;
  total: number;
  totalWithTip: number;
}

export function buildTicketHtml(p: BuildTicketParams): string {
  const w = p.ticketWidth || '80mm';
  const igicRate = 0.07;
  const baseImponible = p.total / (1 + igicRate);
  const cuotaIgic = p.total - baseImponible;

  function row(item: OrderItem) {
    const mods = item.modifiers?.length
      ? item.modifiers.map(m => m.optionName).join(', ')
      : '';
    const aIcons = p.catalogProducts
      ? (p.catalogProducts.find(pr => pr.id === item.productId)?.allergens || [])
          .map(aid => ALLERGENS.find(a => a.id === aid))
          .filter(Boolean)
          .map(a => `<span style="font-size:8px;color:#888;margin-right:2px">[${a!.abbr}]</span>`)
          .join('')
      : '';
    return `<div style="margin-bottom:5px">
      <div style="font-weight:bold;font-size:10px">${item.name} ${aIcons}</div>
      ${mods ? `<div style="font-size:9px;color:#555;padding-left:4px">${mods}</div>` : ''}
      <div class="r" style="font-size:9px">
        <span>${item.qty} x ${item.price.toFixed(2)}€</span>
        <span>${(item.qty * item.price).toFixed(2)}€</span>
      </div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { margin:0; size:${w} auto; }
  body { width:${w}; padding:2mm 3mm; font-family:'Courier New',monospace; font-size:10px; line-height:1.35; color:#222; background:#fff; }
  .c { text-align:center; }
  .b { font-weight:bold; }
  .d { border-top:1px dashed #999; margin:5px 0; }
  .ds { border-top:1px solid #999; margin:5px 0; }
  .r { display:flex; justify-content:space-between; }
</style></head><body>
  ${p.logoUrl ? `<div class="c"><img src="${p.logoUrl}" style="max-width:60%;max-height:40px;margin-bottom:4px" /></div>` : ''}
  <div class="c b" style="font-size:14px;margin-bottom:2px">${p.restaurantName || 'LA COMANDA'}</div>
  <div class="c" style="font-size:9px;margin-bottom:4px;color:#555">
    ${p.companyCif ? `CIF: ${p.companyCif}<br>` : ''}${p.companyAddress ? `${p.companyAddress}<br>` : ''}${p.companyPhone ? `Tel: ${p.companyPhone}<br>` : ''}
  </div>
  <div class="c" style="font-size:9px;margin-bottom:2px">${p.date || ''}</div>
  <div class="c" style="font-size:9px;margin-bottom:4px">Mesa: ${p.tableName || '—'}${p.employeeName ? ' · ' + p.employeeName : ''}</div>
  ${p.ticketNumber ? `<div class="c b" style="font-size:11px;margin-bottom:4px;color:#c4a04a">Ticket #${p.ticketNumber}</div>` : ''}
  <div class="d"></div>
  ${p.items.map(row).join('')}
  <div class="d"></div>
  <div class="r" style="font-size:9px"><span>Subtotal</span><span>${p.subtotal.toFixed(2)}€</span></div>
  ${p.discountAmount > 0 ? `<div class="r" style="font-size:9px;color:#777"><span>Dto.</span><span>-${p.discountAmount.toFixed(2)}€</span></div>` : ''}
  <div class="r" style="font-size:9px;color:#555"><span>Base Imponible</span><span>${baseImponible.toFixed(2)}€</span></div>
  <div class="r" style="font-size:9px;color:#555"><span>IGIC 7%</span><span>${cuotaIgic.toFixed(2)}€</span></div>
  <div class="r b" style="font-size:11px"><span>Total</span><span>${p.total.toFixed(2)}€</span></div>
  ${p.tip > 0 ? `<div class="r" style="font-size:9px;color:#777"><span>Propina · NO fiscal${p.tipMethod ? ' (' + p.tipMethod + ')' : ''}</span><span>+${p.tip.toFixed(2)}€</span></div>` : ''}
  <div class="ds"></div>
  <div class="r b" style="font-size:13px;padding-top:2px"><span>TOTAL A PAGAR</span><span>${p.totalWithTip.toFixed(2)}€</span></div>
  <div class="d"></div>
  ${p.verifactuNum ? `<div class="c" style="font-size:8px;color:#555;margin-top:2px">Verifactu: ${p.verifactuNum}</div>` : ''}
  <div class="c" style="font-size:9px;margin-top:4px;color:#555">${p.footerText || 'Gracias por su visita'}</div>
</body></html>`;
}
