import { useState, useMemo } from 'react';
import { Search, X, Undo2, Euro, ChevronDown, Check, FileText } from 'lucide-react';
import { euros, round2, clone } from './constants';

export default function PedidosView({ sales, onRefund, onConfirmBizum, onPrintInvoice, onDownloadPdf, onSendInvoiceEmail, colors: C }) {
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('week');
  const [selectedSale, setSelectedSale] = useState(null);
  const [refundMode, setRefundMode] = useState('items');
  const [checked, setChecked] = useState({});
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const filtered = useMemo(() => {
    let list = [...sales].filter(s => s.id && s.totalWithTip > 0).sort((a, b) => b.closedAt - a.closedAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (dateFilter === 'today') list = list.filter(s => s.closedAt >= today);
    else if (dateFilter === 'week') {
      const weekAgo = today - 6 * 86400000;
      list = list.filter(s => s.closedAt >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      list = list.filter(s => s.closedAt >= monthStart);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.tableName?.toLowerCase().includes(q) ||
        s.employeeName?.toLowerCase().includes(q) ||
        s.items?.some(i => i.name?.toLowerCase().includes(q)) ||
        String(s.ticketNumber || '').includes(q)
      );
    }
    return list;
  }, [sales, query, dateFilter]);

  const totalRefunded = (sale) => (sale.refunds || []).reduce((s, r) => s + r.amount, 0);
  const maxRefundable = (sale) => Math.max(0, (sale.totalWithTip || 0) - totalRefunded(sale));

  function openRefund(sale) {
    setSelectedSale(sale);
    setRefundMode('items');
    setChecked({});
    setRefundAmount('');
    setRefundReason('');
  }

  function calcItemTotal(sale) {
    return (sale.items || []).reduce((s, i) => i.voided ? s : s + (i.price || 0) * (i.qty || 0), 0);
  }

  function calcSelectedTotal() {
    if (!selectedSale) return 0;
    return (selectedSale.items || []).reduce((s, i) => {
      const q = checked[i.id] ?? 0;
      return s + (i.price || 0) * q;
    }, 0);
  }

  function submitRefund() {
    if (!selectedSale) return;
    let amount = 0;
    if (refundMode === 'items') {
      amount = calcSelectedTotal();
    } else {
      amount = parseFloat(refundAmount) || 0;
    }
    if (amount <= 0) return;
    if (amount > maxRefundable(selectedSale)) return;

    const refundedItems = refundMode === 'items'
      ? (selectedSale.items || []).filter(i => (checked[i.id] ?? 0) > 0).map(i => ({ name: i.name, qty: checked[i.id], price: i.price }))
      : [];

    const refund = {
      id: 'r_' + Date.now(),
      mode: refundMode,
      amount: round2(amount),
      items: refundedItems,
      reason: refundReason || (refundMode === 'items' ? 'Devolución por artículos' : 'Devolución por importe'),
      employeeName: '—',
      createdAt: Date.now(),
    };
    onRefund(selectedSale.id, refund);
    setSelectedSale(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>PEDIDOS</h2>
        <div style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5" style={{ color: C.muted }} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por mesa, artículo, empleado…"
            style={{ background: 'transparent', color: C.cream, outline: 'none' }}
            className="text-xs w-full" />
          {query && <button onClick={() => setQuery('')} style={{ color: C.muted }}><X className="w-3 h-3" /></button>}
        </div>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-1.5 text-xs">
          <option value="today">Hoy</option>
          <option value="week">Últimos 7 días</option>
          <option value="month">Este mes</option>
          <option value="all">Todos</option>
        </select>
        <span style={{ color: C.muted }} className="text-xs">{filtered.length} pedidos</span>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-12">No hay pedidos cerrados</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(sale => {
            const refTotal = totalRefunded(sale);
            const maxRef = maxRefundable(sale);
            return (
              <div key={sale.id}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="rounded-lg p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: C.cream }} className="text-sm font-medium">{sale.tableName}</span>
                    <span style={{ color: C.muted }} className="text-[10px] font-mono">
                      #{sale.ticketNumber || '-'}
                    </span>
                    <span style={{ color: C.muted }} className="text-[10px]">
                      {new Date(sale.closedAt).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {refTotal > 0 && (
                      <span style={{ color: C.wineLight }} className="text-[10px] font-medium">
                        ↩️ Devoluciones: {euros(refTotal)}
                      </span>
                    )}
                    {sale.invoiceCreated && (
                      <span style={{ color: C.sageLight }} className="text-[10px] font-medium">
                        🧾 {sale.invoiceNumber}
                      </span>
                    )}
                    {sale.hasPendingBizum && (
                      <span style={{ color: '#fbbf24' }} className="text-[10px] font-medium bg-yellow-900/30 px-1.5 py-0.5 rounded">
                        ⏳ Bizum pendiente
                      </span>
                    )}
                    {sale.verifactuStatus && sale.verifactuStatus !== 'registrado' && (
                      <span style={{
                        color: sale.verifactuStatus === 'pendiente' ? C.muted : C.wineLight,
                        background: (sale.verifactuStatus === 'pendiente' ? C.muted : C.wineLight) + '20',
                      }} className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <span>{sale.verifactuStatus === 'simulado' ? '🔶' : '⚪'}</span>
                        Verifactu: {sale.verifactuStatus}
                      </span>
                    )}
                  </div>
                  <p style={{ color: C.muted }} className="text-xs truncate mt-0.5">
                    {sale.items?.filter(i => !i.voided).slice(0, 4).map(i => i.name).join(', ')}
                    {(sale.items?.filter(i => !i.voided).length || 0) > 4 && '...'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ color: C.cream }} className="text-xs font-mono font-bold">{euros(sale.totalWithTip || 0)}</span>
                    <span style={{ color: C.muted }} className="text-[10px]">{sale.paymentMethod}</span>
                    <span style={{ color: C.muted }} className="text-[10px]">{sale.employeeName}</span>
                  </div>
                </div>
                  <div className="flex items-center gap-1.5">
                  {sale.hasPendingBizum && (
                    <button onClick={(e) => { e.stopPropagation(); onConfirmBizum(sale.id); }}
                      style={{ color: '#fbbf24', background: '#fbbf24' + '20', border: '1px solid #fbbf24' }}
                      className="rounded-lg px-2.5 py-2 text-xs font-medium flex items-center gap-1 hover:opacity-80">
                      ✅ Confirmar Bizum
                    </button>
                  )}
                  {sale.invoiceCreated ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); onPrintInvoice?.(sale); }}
                        style={{ color: C.sageLight, background: C.sage + '20', border: `1px solid ${C.sage}` }}
                        className="rounded-lg px-2.5 py-2 text-xs font-medium flex items-center gap-1 hover:opacity-80">
                        <FileText className="w-3.5 h-3.5" /> {sale.invoiceNumber}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDownloadPdf?.(sale); }}
                        style={{ color: C.brassLight, background: C.brass + '20', border: `1px solid ${C.brass}` }}
                        className="rounded-lg px-2 py-2 text-xs font-medium hover:opacity-80">
                        PDF
                      </button>
                      {sale.invoiceEmail && (
                        <button onClick={(e) => { e.stopPropagation(); onSendInvoiceEmail?.(sale); }}
                          style={{ color: '#6b9bf8', background: '#6b9bf8' + '20', border: '1px solid #6b9bf8' }}
                          className="rounded-lg px-2 py-2 text-xs font-medium hover:opacity-80">
                          Email
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); onPrintInvoice?.(sale); }}
                      style={{ color: C.brassLight, background: C.brass + '20', border: `1px solid ${C.brass}` }}
                      className="rounded-lg px-2.5 py-2 text-xs font-medium flex items-center gap-1 hover:opacity-80">
                      <FileText className="w-3.5 h-3.5" /> Factura
                    </button>
                  )}
                  <button onClick={() => openRefund(sale)}
                    disabled={maxRef <= 0}
                    style={{
                      background: maxRef > 0 ? C.sage + '30' : C.surfaceLight,
                      color: maxRef > 0 ? C.sageLight : C.muted,
                      border: `1px solid ${maxRef > 0 ? C.sage : C.line}`,
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 disabled:cursor-not-allowed hover:opacity-80 shrink-0">
                    <Undo2 className="w-3.5 h-3.5" /> Devolver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal devolución ── */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setSelectedSale(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-md rounded-xl p-5 fade-up max-h-[80vh] flex flex-col">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>↩️ Devolución</p>
            <p style={{ color: C.muted }} className="text-xs mb-3">
              {selectedSale.tableName} · {euros(selectedSale.totalWithTip || 0)}
              {totalRefunded(selectedSale) > 0 && ` · ${euros(totalRefunded(selectedSale))} ya devuelto`}
            </p>

            {/* Modo */}
            <div className="flex gap-2 mb-3">
              {['items', 'amount'].map(m => (
                <button key={m} onClick={() => setRefundMode(m)}
                  style={{
                    background: refundMode === m ? C.brass + '30' : C.surfaceLight,
                    border: `1px solid ${refundMode === m ? C.brass : C.line}`,
                    color: refundMode === m ? C.brassLight : C.cream,
                  }}
                  className="flex-1 rounded-lg py-2 text-xs font-medium">
                  {m === 'items' ? 'Por artículos' : 'Por importe'}
                </button>
              ))}
            </div>

            <p style={{ color: C.muted }} className="text-xs mb-2">
              Máximo devolvible: <span style={{ color: C.cream }} className="font-mono">{euros(maxRefundable(selectedSale))}</span>
            </p>

            {/* Items list */}
            {refundMode === 'items' && (
              <div className="flex-1 overflow-y-auto mb-3 space-y-1">
                {(selectedSale.items || []).filter(i => !i.voided).map(item => {
                  const qty = checked[item.id] ?? 0;
                  return (
                    <div key={item.id}
                      style={{ background: qty > 0 ? C.sage + '15' : C.surfaceLight, border: `1px solid ${qty > 0 ? C.sage + '40' : 'transparent'}` }}
                      className="rounded-lg px-3 py-2 flex items-center gap-2">
                      <button onClick={() => setChecked(c => ({ ...c, [item.id]: qty > 0 ? 0 : 1 }))}
                        style={{ color: qty > 0 ? C.sage : C.muted }}
                        className="shrink-0">
                        {qty > 0 ? <Check className="w-4 h-4" /> : <span className="w-4 h-4 rounded border inline-block" style={{ borderColor: C.line }} />}
                      </button>
                      <span style={{ color: C.cream }} className="text-xs flex-1 truncate">{item.name}</span>
                      {item.qty > 1 && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setChecked(c => ({ ...c, [item.id]: Math.max(0, (c[item.id] ?? 0) - 1) }))}
                            style={{ color: C.muted }} className="p-0.5 hover:opacity-80">−</button>
                          <span style={{ color: C.cream }} className="text-xs font-mono w-4 text-center">{qty}</span>
                          <button onClick={() => setChecked(c => ({ ...c, [item.id]: Math.min(item.qty, (c[item.id] ?? 0) + 1) }))}
                            style={{ color: C.muted }} className="p-0.5 hover:opacity-80">+</button>
                        </div>
                      )}
                      <span style={{ color: C.muted }} className="text-xs font-mono">{euros(item.price || 0)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Amount input */}
            {refundMode === 'amount' && (
              <div className="mb-3">
                <input type="number" step="0.01" min="0" max={maxRefundable(selectedSale)}
                  value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                  className="w-full rounded-lg px-3 py-2.5 text-lg font-mono text-center" />
              </div>
            )}

            {/* Reason */}
            <input type="text" value={refundReason} onChange={e => setRefundReason(e.target.value)}
              placeholder="Motivo de la devolución (opcional)"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mb-3" />

            {/* Total and confirm */}
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: C.muted }} className="text-xs">
                {refundMode === 'items' ? `Total seleccionado` : `Importe`}
              </span>
              <span style={{ color: C.wineLight }} className="font-mono font-bold">
                {euros(refundMode === 'items' ? calcSelectedTotal() : (parseFloat(refundAmount) || 0))}
              </span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setSelectedSale(null)}
                style={{ background: C.surfaceLight, color: C.muted }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={submitRefund}
                disabled={(refundMode === 'items' ? calcSelectedTotal() : (parseFloat(refundAmount) || 0)) <= 0}
                style={{
                  background: (refundMode === 'items' ? calcSelectedTotal() : (parseFloat(refundAmount) || 0)) > 0 ? C.wine : C.surfaceLight,
                  color: (refundMode === 'items' ? calcSelectedTotal() : (parseFloat(refundAmount) || 0)) > 0 ? C.cream : C.muted,
                }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed">
                Confirmar devolución
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}