"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, Filter, CreditCard, Banknote, Smartphone, Clock,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import { euros } from './constants';

const METHOD_ICONS = {
  tarjeta: CreditCard,
  efectivo: Banknote,
  bizum: Smartphone,
  fiado: Clock,
};

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'disputed', label: 'Disputados' },
  { value: 'unconfirmed', label: 'No confirmados' },
  { value: 'refunded', label: 'Con devolución' },
  { value: 'fiado', label: 'Fiados' },
];

export default function PaymentsView({ colors: C }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    method: '',
    employee: '',
    status: '',
    minAmount: '',
    maxAmount: '',
  });

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', new Date(filters.from).getTime());
      if (filters.to) params.set('to', new Date(filters.to + 'T23:59:59').getTime());
      if (filters.method) params.set('method', filters.method);
      if (filters.employee) params.set('employee', filters.employee);
      if (filters.status) params.set('status', filters.status);
      if (filters.minAmount) params.set('minAmount', filters.minAmount);
      if (filters.maxAmount) params.set('maxAmount', filters.maxAmount);

      const res = await fetch(`/api/payments?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setData(d);
    } catch (err) {
      showToast('Error al cargar pagos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleExportCSV() {
    if (!data?.payments?.length) return;
    const headers = ['ID', 'Fecha', 'Mesa', 'Empleado', 'Método', 'Total', 'Propina', 'Factura', 'Stripe ID', 'Estado Stripe', 'Disputa', 'Devoluciones'];
    const rows = data.payments.map(p => [
      p.id,
      new Date(p.closedAt).toLocaleString('es-ES'),
      p.tableName,
      p.employeeName,
      p.paymentMethod,
      p.total.toFixed(2),
      p.tip.toFixed(2),
      p.invoiceNumber || (p.hasInvoice ? 'Sí' : ''),
      p.paymentIntentId.slice(-12),
      p.stripeConfirmed ? 'Confirmado' : (p.paymentIntentId ? 'Pendiente' : '—'),
      p.disputeStatus || '—',
      p.refundCount > 0 ? `${p.refundCount} dev.` : '',
    ]);
    const csv = [rows.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `pagos_${filters.from}_${filters.to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxHeight: '100vh', overflowY: 'auto' }}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <CreditCard className="w-5 h-5" style={{ color: C.brassLight }} />
        <h3 className="font-display text-xl" style={{ color: C.cream }}>PAGOS</h3>
        {data?.summary && (
          <span className="text-xs font-mono" style={{ color: C.muted }}>
            {data.summary.count} pagos · {euros(data.summary.total)}
          </span>
        )}
        <div className="flex-1" />
        <button onClick={loadData}
          style={{ background: C.surfaceLight, color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={handleExportCSV}
          style={{ background: C.surfaceLight, color: C.brassLight, border: `1px solid ${C.brass}` }}
          className="text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 hover:opacity-80">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input type="date" value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm" />
        <select value={filters.method}
          onChange={e => setFilters(f => ({ ...f, method: e.target.value }))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los métodos</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="efectivo">Efectivo</option>
          <option value="bizum">Bizum</option>
          <option value="fiado">Fiado</option>
        </select>
        <select value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm">
          {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <input type="number" placeholder="Min €" value={filters.minAmount}
            onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, width: 80 }}
            className="rounded-lg px-2 py-2 text-sm" />
          <span style={{ color: C.muted }}>-</span>
          <input type="number" placeholder="Max €" value={filters.maxAmount}
            onChange={e => setFilters(f => ({ ...f, maxAmount: e.target.value }))}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, width: 80 }}
            className="rounded-lg px-2 py-2 text-sm" />
        </div>
        <input type="text" placeholder="Empleado..." value={filters.employee}
          onChange={e => setFilters(f => ({ ...f, employee: e.target.value }))}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]" />
      </div>

      {/* Resumen por método */}
      {data?.summary?.byMethod && (
        <div className="flex flex-wrap gap-3 mb-5">
          {Object.entries(data.summary.byMethod).map(([method, total]) => {
            const Icon = METHOD_ICONS[method] || CreditCard;
            return (
              <div key={method}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="rounded-xl px-4 py-3 flex items-center gap-3">
                <Icon className="w-4 h-4" style={{ color: C.brassLight }} />
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: C.muted }}>{method}</p>
                  <p className="font-mono text-sm font-semibold" style={{ color: C.cream }}>{euros(total)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-8">Cargando pagos...</p>
      ) : !data?.payments?.length ? (
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-8 text-center">
          <Search className="w-8 h-8 mx-auto mb-2" style={{ color: C.muted }} />
          <p className="text-sm" style={{ color: C.muted }}>No hay pagos en este período</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {data.payments.map(p => {
            const Icon = METHOD_ICONS[p.paymentMethod] || CreditCard;
            const hasWarning = p.disputeStatus || (!p.stripeConfirmed && p.paymentIntentId) || p.hasRefunds;
            return (
              <div key={p.id}
                style={{
                  background: C.surface,
                  border: `1px solid ${hasWarning ? C.wine + '40' : C.line}`,
                }}
                className="rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: C.brassLight }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: C.cream }}>{p.tableName}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: C.muted }}>
                      {new Date(p.closedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{p.employeeName}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    {p.disputeStatus && p.disputeStatus !== 'dispute_won' && (
                      <span className="text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                        style={{ background: C.wine + '30', color: C.wineLight }}>
                        <AlertTriangle className="w-3 h-3" /> {p.disputeStatus === 'disputed' ? 'Disputa' : p.disputeStatus}
                      </span>
                    )}
                    {!p.stripeConfirmed && p.paymentIntentId && (
                      <span className="text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                        style={{ background: '#fbbf24' + '30', color: '#fbbf24' }}>
                        <XCircle className="w-3 h-3" /> No confirmado
                      </span>
                    )}
                    {p.hasRefunds && (
                      <span className="text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                        style={{ background: C.sage + '30', color: C.sageLight }}>
                        ↩️ {p.refundCount} dev.
                      </span>
                    )}
                    {p.isFiado && (
                      <span className="text-[10px] font-medium" style={{ color: C.muted }}>
                        Fiado
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-sm font-semibold shrink-0" style={{ color: C.brassLight }}>
                    {euros(p.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: C.muted }}>
                  <span>Método: {p.paymentMethod}</span>
                  {p.paymentIntentId && <span>· Stripe: {p.paymentIntentId.slice(-12)}</span>}
                  {p.hasInvoice && <span>· {p.invoiceNumber || 'Factura'}</span>}
                  {p.tip > 0 && <span>· Propina: {euros(p.tip)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}