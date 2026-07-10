"use client";

import { useState, useMemo } from 'react';
import { Ticket, Download, Search, Printer } from 'lucide-react';
import { euros } from './constants';

export default function TicketsView({ sales, colors: C, ticketSettings = {} }) {
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('Todas');
  const [daysBack, setDaysBack] = useState(0); // 0 = hoy, 7 = última semana, 30 = último mes

  const today = new Date().toDateString();

  const cutoffTime = useMemo(() => {
    if (daysBack === 0) return 0; // no cutoff by time, filter by date string below
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [daysBack]);

  const filteredSales = useMemo(() => {
    return (sales || []).filter(s => {
      const t = Number(s.closedAt) || new Date(s.closedAt).getTime();
      if (daysBack > 0) {
        if (t < cutoffTime) return false;
      } else {
        const saleDate = new Date(t).toDateString();
        if (saleDate !== today) return false;
      }
      if (filterMethod !== 'Todas') {
        const method = s.paymentMethod || '';
        if (method.toLowerCase() !== filterMethod.toLowerCase()) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const matchesTable = (s.tableName || '').toLowerCase().includes(q);
        const matchesEmployee = (s.employeeName || '').toLowerCase().includes(q);
        const matchesId = (s.id || '').toLowerCase().includes(q);
        if (!matchesTable && !matchesEmployee && !matchesId) return false;
      }
      return true;
    }).sort((a, b) => b.closedAt - a.closedAt);
  }, [sales, today, filterMethod, search, daysBack, cutoffTime]);

  const totalAmount = filteredSales.reduce((s, x) => s + x.total, 0);
  const methods = useMemo(() => {
    const set = new Set();
    (sales || []).forEach(s => {
      if (s.paymentMethod) set.add(s.paymentMethod);
    });
    return ['Todas', ...Array.from(set)];
  }, [sales]);

  function printTicket(sale) {
    const d = new Date(sale.closedAt);
    const dateStr = d.toLocaleString('es-ES');
    const items = (sale.items || []).filter(i => !i.voided);
    const itemsHtml = items.map(i =>
      `<div style="font-weight:bold;font-size:11px">${i.name}</div>
       <div class="ticket-row" style="font-size:10px"><span>${i.qty} x ${i.price.toFixed(2)}€</span><span>${(i.qty * i.price).toFixed(2)}€</span></div>`
    ).join('');
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmount = sale.discountAmount || 0;
    const totalConIgic = subtotal - discountAmount;
    const baseImponible = Math.round(totalConIgic * 100 / 1.07) / 100;
    const cuotaIgic = totalConIgic - baseImponible;
    const tip = sale.tip || 0;
    const total = sale.totalWithTip || sale.total || 0;
    const s = ticketSettings || {};
    const html = `<html><head><meta charset="utf-8"><style>
      @page { margin:0; size:80mm auto; }
      body { font-family:'Courier New',monospace; font-size:12px; width:72mm; margin:0 auto; padding:4mm 0; color:#000; }
      .ticket-header { text-align:center; font-size:14px; font-weight:bold; margin-bottom:2px; }
      .ticket-sub { text-align:center; font-size:9px; color:#555; margin-bottom:4px; }
      .ticket-divider { border-top:1px dashed #000; margin:4px 0; }
      .ticket-row { display:flex; justify-content:space-between; font-size:11px; }
      .ticket-total { font-weight:bold; font-size:13px; }
    </style></head><body>
      <div class="ticket-header">${s.restaurantName || 'LA COMANDA'}</div>
      <div class="ticket-sub">
        ${s.companyCif ? `CIF: ${s.companyCif}<br>` : ''}${s.companyAddress ? `${s.companyAddress}<br>` : ''}${s.companyPhone ? `Tel: ${s.companyPhone}<br>` : ''}
      </div>
      <div style="text-align:center;font-size:9px;margin-bottom:4px">
        ${dateStr}<br/>
        Mesa: ${sale.tableName || '—'}<br/>
        ${sale.employeeName ? 'Camarero: ' + sale.employeeName : ''}
      </div>
      <div class="ticket-divider"/>
      ${itemsHtml}
      <div class="ticket-divider"/>
      <div class="ticket-row" style="font-size:10px"><span>Subtotal</span><span>${euros(subtotal)}</span></div>
      ${discountAmount > 0 ? `<div class="ticket-row" style="font-size:9px;color:#777"><span>Dto.</span><span>-${euros(discountAmount)}</span></div>` : ''}
      <div class="ticket-row" style="font-size:9px;color:#555"><span>Base Imponible</span><span>${euros(baseImponible)}</span></div>
      <div class="ticket-row" style="font-size:9px;color:#555"><span>IGIC 7%</span><span>${euros(cuotaIgic)}</span></div>
      <div class="ticket-row ticket-total"><span>Total</span><span>${euros(totalConIgic)}</span></div>
      ${tip > 0 ? `<div class="ticket-row" style="font-size:9px;color:#777"><span>Propina · NO fiscal</span><span>+${euros(tip)}</span></div>` : ''}
      <div style="border-top:1px solid #000;margin:4px 0"></div>
      <div class="ticket-row ticket-total" style="font-size:14px"><span>TOTAL A PAGAR</span><span>${euros(total)}</span></div>
      <div class="ticket-divider"/>
      <div style="text-align:center;font-size:9px;margin-top:4px;color:#555">${s.footerText || 'Gracias por su visita'}</div>
    </body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none';
    document.body.appendChild(iframe);
    const w = iframe.contentWindow;
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 300);
  }

  function downloadCSV() {
    const rows = [
      ['ID', 'Hora', 'Mesa', 'Empleado', 'Total', 'Método', 'Artículos'],
      ...filteredSales.map(s => {
        const d = new Date(s.closedAt);
        const items = (s.items || []).map(i => `${i.qty}x ${i.name}`).join('; ');
        return [
          s.id, d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          s.tableName || '', s.employeeName || '', s.total.toFixed(2),
          s.paymentMethod || '', items,
        ];
      }),
      [],
      ['TOTAL', '', '', '', totalAmount.toFixed(2), '', ''],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5" style={{ color: C.brassLight }} />
          <h2 className="font-display text-xl" style={{ color: C.cream }}>
            TICKETS {daysBack === 0 ? 'DE HOY' : daysBack === 7 ? 'DE LA SEMANA' : daysBack === 30 ? 'DEL MES' : ''}
          </h2>
          <span style={{ color: C.muted }} className="text-sm">
            ({filteredSales.length} tickets — {euros(totalAmount)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select value={daysBack} onChange={e => setDaysBack(Number(e.target.value))}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="rounded-lg px-3 py-1.5 text-xs">
            <option value={0}>Hoy</option>
            <option value={7}>Última semana</option>
            <option value={30}>Último mes</option>
            <option value={365}>Todo</option>
          </select>
          <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5" style={{ color: C.muted }} />
            <input
              type="text" placeholder="Buscar mesa, empleado..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', color: C.cream, outline: 'none', border: 'none' }}
              className="text-xs w-36"
            />
          </div>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="rounded-lg px-3 py-1.5 text-xs">
            {methods.map(m => (
              <option key={m} value={m}>{m === 'Todas' ? 'Todos los métodos' : m}</option>
            ))}
          </select>
          <button onClick={downloadCSV} disabled={filteredSales.length === 0}
            style={{ background: C.surfaceLight, color: C.cream }}
            className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40 hover:opacity-80">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {filteredSales.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
          <p style={{ color: C.muted }} className="text-sm">
            No hay tickets en este período. Al pagar una mesa aparecerá aquí.
          </p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl overflow-hidden">
          <div style={{ background: C.surfaceLight, color: C.muted }}
            className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wide">
            <span>Ticket</span>
            <span>Fecha</span>
            <span>Hora</span>
            <span>Mesa</span>
            <span>Empleado</span>
            <span className="text-right">Total</span>
            <span>Método</span>
            <span className="col-span-4">Artículos</span>
            <span className="text-right"></span>
          </div>
          {filteredSales.map((s, i) => {
            const d = new Date(s.closedAt);
            const items = (s.items || []).slice(0, 3);
            const extra = (s.items || []).length - 3;
            return (
              <div key={s.id} style={{ borderTop: `1px solid ${C.line}` }}
                className="grid grid-cols-12 gap-2 px-4 py-2 text-sm items-center">
                <span className="font-mono text-xs" style={{ color: C.brass }}>
                  #{s.ticketNumber || '-'}
                </span>
                <span className="font-mono text-xs" style={{ color: C.muted }}>
                  {d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="font-mono" style={{ color: C.cream }}>
                  {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ color: C.cream }}>{s.tableName || '—'}</span>
                <span style={{ color: C.muted }}>{s.employeeName || '—'}</span>
                <span className="font-mono text-right" style={{ color: C.brassLight }}>
                  {euros(s.total)}
                </span>
                <span className="text-xs" style={{ color: C.muted }}>
                  {s.paymentMethod || '—'}
                </span>
                <span className="col-span-4" style={{ color: C.muted }}>
                  {items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                  {extra > 0 && <span style={{ color: C.brass }}> +{extra} más</span>}
                </span>
                <button onClick={() => printTicket(s)}
                  style={{ color: C.muted, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  className="hover:opacity-80 text-right">
                  <Printer className="w-3.5 h-3.5 inline" />
                </button>
              </div>
            );
          })}
          <div style={{ borderTop: `2px solid ${C.brass}`, background: C.surfaceLight }}
            className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-semibold items-center">
            <span className="col-span-5" style={{ color: C.cream }}>{daysBack === 0 ? 'TOTAL DEL DÍA' : daysBack === 7 ? 'TOTAL DE LA SEMANA' : daysBack === 30 ? 'TOTAL DEL MES' : 'TOTAL'}</span>
            <span className="font-mono text-right" style={{ color: C.brassLight }}>
              {euros(totalAmount)}
            </span>
            <span className="col-span-6" style={{ color: C.muted }}>
              {filteredSales.length} tickets
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
