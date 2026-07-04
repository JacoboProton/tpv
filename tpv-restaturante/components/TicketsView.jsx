"use client";

import { useState, useMemo } from 'react';
import { Ticket, Download, Search } from 'lucide-react';
import { euros } from './constants';

export default function TicketsView({ sales, colors: C }) {
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('Todas');

  const today = new Date().toDateString();

  const todaySales = useMemo(() => {
    return (sales || []).filter(s => {
      const d = new Date(s.closedAt).toDateString();
      if (d !== today) return false;
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
  }, [sales, today, filterMethod, search]);

  const totalAmount = todaySales.reduce((s, x) => s + x.total, 0);
  const methods = useMemo(() => {
    const set = new Set();
    (sales || []).forEach(s => {
      if (s.paymentMethod) set.add(s.paymentMethod);
    });
    return ['Todas', ...Array.from(set)];
  }, [sales]);

  function downloadCSV() {
    const rows = [
      ['ID', 'Hora', 'Mesa', 'Empleado', 'Total', 'Método', 'Artículos'],
      ...todaySales.map(s => {
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
            TICKETS DE HOY
          </h2>
          <span style={{ color: C.muted }} className="text-sm">
            ({todaySales.length} tickets — {euros(totalAmount)})
          </span>
        </div>
        <div className="flex items-center gap-2">
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
          <button onClick={downloadCSV} disabled={todaySales.length === 0}
            style={{ background: C.surfaceLight, color: C.cream }}
            className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40 hover:opacity-80">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {todaySales.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="w-10 h-10 mx-auto mb-3" style={{ color: C.muted }} />
          <p style={{ color: C.muted }} className="text-sm">
            No hay tickets generados hoy. Al pagar una mesa aparecerá aquí.
          </p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl overflow-hidden">
          <div style={{ background: C.surfaceLight, color: C.muted }}
            className="grid grid-cols-8 gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wide">
            <span>Hora</span>
            <span>Mesa</span>
            <span>Empleado</span>
            <span className="text-right">Total</span>
            <span>Método</span>
            <span className="col-span-3">Artículos</span>
          </div>
          {todaySales.map(s => {
            const d = new Date(s.closedAt);
            const items = (s.items || []).slice(0, 3);
            const extra = (s.items || []).length - 3;
            return (
              <div key={s.id} style={{ borderTop: `1px solid ${C.line}` }}
                className="grid grid-cols-8 gap-2 px-4 py-2 text-sm items-center">
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
                <span className="col-span-3" style={{ color: C.muted }}>
                  {items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                  {extra > 0 && <span style={{ color: C.brass }}> +{extra} más</span>}
                </span>
              </div>
            );
          })}
          <div style={{ borderTop: `2px solid ${C.brass}`, background: C.surfaceLight }}
            className="grid grid-cols-8 gap-2 px-4 py-3 text-sm font-semibold items-center">
            <span className="col-span-3" style={{ color: C.cream }}>TOTAL DEL DÍA</span>
            <span className="font-mono text-right" style={{ color: C.brassLight }}>
              {euros(totalAmount)}
            </span>
            <span className="col-span-4" style={{ color: C.muted }}>
              {todaySales.length} tickets
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
