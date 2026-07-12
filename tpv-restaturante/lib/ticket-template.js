export function buildTicketHtml({
  items, subtotal, discountAmount, totalConIgic, baseImponible, cuotaIgic,
  tip, tipMethod, totalWithTip,
  restaurantName, companyCif, companyAddress, companyPhone, logoUrl, footerText, ticketWidth,
  tableName, employeeName, ticketLabel, ticketNumber, date,
  catalog, allergensList,
}) {
  function row(item) {
    const mods = item.modifiers?.length
      ? `<div style="font-size:9px;color:#555;padding-left:4px">${item.modifiers.map(m => `+ ${m.optionName || m.name || ''}`).join('<br>')}</div>`
      : '';
    const aIcons = item.productId && catalog?.products
      ? (catalog.products.find(p => p.id === item.productId)?.allergens || [])
        .map(aid => {
          const a = (allergensList || []).find(x => x.id === aid);
          return a ? `<span style="font-size:8px;color:#888;margin-right:2px">[${a.abbr}]</span>` : '';
        }).join('')
      : '';
    return `<div style="margin-bottom:5px">
      <div style="font-weight:bold;font-size:10px">${item.name} ${aIcons}</div>
      ${mods}
      <div class="r" style="font-size:9px">
        <span>${item.qty} x ${item.price.toFixed(2)}€</span>
        <span>${(item.qty * item.price).toFixed(2)}€</span>
      </div>
    </div>`;
  }

  const w = ticketWidth || '80mm';
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
  ${logoUrl ? `<div class="c"><img src="${logoUrl}" style="max-width:60%;max-height:40px;margin-bottom:4px" /></div>` : ''}
  <div class="c b" style="font-size:14px;margin-bottom:2px">${restaurantName || ''}</div>
  <div class="c" style="font-size:9px;margin-bottom:4px;color:#555">
    ${companyCif ? `CIF: ${companyCif}<br>` : ''}${companyAddress ? `${companyAddress}<br>` : ''}${companyPhone ? `Tel: ${companyPhone}<br>` : ''}
  </div>
  <div class="c" style="font-size:9px;margin-bottom:2px">${date || ''}</div>
  <div class="c" style="font-size:9px;margin-bottom:4px">Mesa: ${tableName || '—'}${employeeName ? ' · Camarero: ' + employeeName : ''}${ticketLabel ? ' · ' + ticketLabel : ''}</div>
  ${ticketNumber ? `<div class="c b" style="font-size:11px;margin-bottom:4px;color:#c4a04a">Ticket #${ticketNumber}</div>` : ''}
  <div class="d"></div>
  ${items.map(row).join('')}
  <div class="d"></div>
  <div class="r" style="font-size:9px"><span>Subtotal</span><span>${euros(subtotal)}</span></div>
  ${discountAmount > 0 ? `<div class="r" style="font-size:9px;color:#777"><span>Dto.</span><span>-${euros(discountAmount)}</span></div>` : ''}
  <div class="r" style="font-size:9px;color:#555"><span>Base Imponible</span><span>${euros(baseImponible)}</span></div>
  <div class="r" style="font-size:9px;color:#555"><span>IGIC 7%</span><span>${euros(cuotaIgic)}</span></div>
  <div class="r b" style="font-size:11px"><span>Total</span><span>${euros(totalConIgic)}</span></div>
  ${tip > 0 ? `<div class="r" style="font-size:9px;color:#777"><span>Propina · NO fiscal${tipMethod ? ' (' + tipMethod + ')' : ''}</span><span>+${euros(tip)}</span></div>` : ''}
  <div class="ds"></div>
  <div class="r b" style="font-size:13px;padding-top:2px"><span>TOTAL A PAGAR</span><span>${euros(totalWithTip)}</span></div>
  <div class="d"></div>
  <div class="c" style="font-size:9px;margin-top:4px;color:#555">${footerText || 'Gracias por su visita'}</div>
</body></html>`;
}

export function printTicketHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none';
  document.body.appendChild(iframe);
  const w = iframe.contentWindow;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 300);
}

function euros(n) {
  return Number(n || 0).toFixed(2) + '€';
}
