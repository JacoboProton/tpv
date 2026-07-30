'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Send, Truck, Check, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { PurchaseOrder, PurchaseOrderLine, Supplier, CatalogProduct, SupplierCatalogOffer, OrderLineForm } from './types';
import { ORDER_STATUS, STATUS_LABELS, STATUS_COLORS } from './types';

export function OrdersTab({ orders, suppliers, catalog, nonElaborados, C, onRefresh }: {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  catalog: { products: CatalogProduct[] } | null;
  nonElaborados: CatalogProduct[];
  C: Theme;
  onRefresh: () => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    return list;
  }, [orders, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {['all', ...ORDER_STATUS].map(sk => (
            <button key={sk} onClick={() => setStatusFilter(sk)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium"
              style={{ background: statusFilter === sk ? C.surfaceLight : 'transparent', color: statusFilter === sk ? C.brassLight : C.muted }}>
              {sk === 'all' ? 'Todas' : STATUS_LABELS[sk]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => { setShowNew(true); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
          style={{ background: C.sage + '30', color: C.sage }}>
          <Plus className="w-3.5 h-3.5" /> Nuevo pedido
        </button>
      </div>

      {(showNew || editId) && (
        <OrderForm suppliers={suppliers} nonElaborados={nonElaborados} editOrder={editId ? orders.find(o => o.id === editId) ?? null : null} C={C}
          onClose={() => { setShowNew(false); setEditId(null); }} onSaved={() => { onRefresh(); setShowNew(false); setEditId(null); }} />
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: C.muted }}>Sin pedidos</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => (
            <OrderCard key={o.id} order={o} C={C} onEdit={() => setEditId(o.id)} onRefresh={onRefresh} suppliers={suppliers} nonElaborados={nonElaborados} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order: o, C, onEdit, onRefresh, suppliers, nonElaborados }: {
  order: PurchaseOrder;
  C: Theme;
  onEdit: () => void;
  onRefresh: () => void;
  suppliers: Supplier[];
  nonElaborados: CatalogProduct[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [receiveLines, setReceiveLines] = useState(o.lines.map(l => ({ lineId: l.id, receivedQty: l.receivedQty })));
  const [receiveMsg, setReceiveMsg] = useState('');

  const total = o.lines.reduce((s, l) => s + l.quantity * l.pricePerUnit, 0);
  const fullyReceived = o.lines.every(l => l.receivedQty >= l.quantity);

  async function handleStatusChange(newStatus: string) {
    try {
      await fetch('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ action: 'update-status', id: o.id, status: newStatus }),
      });
      onRefresh();
    } catch {}
  }

  async function handleReceive() {
    try {
      const r = await fetch('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ action: 'receive', id: o.id, lines: receiveLines }),
      });
      if (r.ok) {
        setReceiveMsg('✅ Recibido');
        setShowReceive(false);
        onRefresh();
      }
    } catch {}
  }

  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: C.surfaceLight, borderLeft: `4px solid ${STATUS_COLORS[o.status]}` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm" style={{ color: C.cream }}>{o.supplierName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: STATUS_COLORS[o.status] + '30', color: STATUS_COLORS[o.status] }}>
              {STATUS_LABELS[o.status]}
            </span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
            {o.lines.length} líneas · {new Date(o.createdAt).toLocaleDateString('es-ES')}
            {o.expectedDate && <span> · Prevista: {o.expectedDate}</span>}
          </p>
        </div>
        <span className="text-sm font-mono" style={{ color: C.brassLight }}>{total.toFixed(2)}€</span>
      </div>

      <div className="flex gap-1.5">
        {o.status === 'draft' && (
          <button onClick={() => handleStatusChange('sent')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: C.brass + '30', color: C.brassLight }}>
            <Send className="w-3 h-3" /> Enviar
          </button>
        )}
        {(o.status === 'sent' || o.status === 'partial') && (
          <button onClick={() => { setShowReceive(true); setReceiveLines(o.lines.map(l => ({ lineId: l.id, receivedQty: l.receivedQty }))); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: C.sage + '30', color: C.sage }}>
            <Truck className="w-3 h-3" /> Recibir
          </button>
        )}
        {o.status === 'draft' && (
          <button onClick={onEdit}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: C.surface, color: C.muted }}>
            Editar
          </button>
        )}
        <div className="flex-1" />
        <button onClick={() => setExpanded(!expanded)} style={{ color: C.muted }}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-1 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
          {o.lines.map(l => (
            <div key={l.id} className="flex items-center justify-between text-[10px]">
              <div className="flex-1">
                <span style={{ color: C.cream }}>{l.productName}</span>
                <span className="ml-2" style={{ color: C.muted }}>SKU: {l.supplierSku || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: C.muted }}>{l.quantity} × {l.pricePerUnit.toFixed(4)}€</span>
                <span className="font-mono w-16 text-right" style={{ color: C.brassLight }}>{(l.quantity * l.pricePerUnit).toFixed(2)}€</span>
                {l.receivedQty > 0 && (
                  <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.sage + '30', color: C.sage }}>
                    Recibido: {l.receivedQty}
                  </span>
                )}
              </div>
            </div>
          ))}
          {showReceive && (
            <div className="space-y-2 pt-2">
              {receiveLines.map((rl, i) => {
                const line = o.lines[i];
                return (
                  <div key={rl.lineId} className="flex items-center gap-2 text-[10px]">
                    <span className="flex-1" style={{ color: C.cream }}>{line.productName}</span>
                    <input type="number" step="0.01"
                      value={rl.receivedQty} min={0} max={line.quantity}
                      onChange={e => { const nv = [...receiveLines]; nv[i].receivedQty = Number(e.target.value) || 0; setReceiveLines(nv); }}
                      className="w-20 text-center rounded-lg px-2 py-1 text-xs"
                      style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
                    <span style={{ color: C.muted }}>/ {line.quantity}</span>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <button onClick={handleReceive}
                  className="flex-1 py-2 rounded-lg text-[10px] font-medium hover:opacity-80"
                  style={{ background: C.sage + '30', color: C.sage }}>
                  <Check className="w-3 h-3 inline mr-1" /> Confirmar recepción
                </button>
                <button onClick={() => setShowReceive(false)}
                  className="py-2 px-3 rounded-lg text-[10px]"
                  style={{ background: C.surface, color: C.muted }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
              {receiveMsg && <p className="text-xs text-center" style={{ color: C.sage }}>{receiveMsg}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderForm({ suppliers, nonElaborados, editOrder, C, onClose, onSaved }: {
  suppliers: Supplier[];
  nonElaborados: CatalogProduct[];
  editOrder: PurchaseOrder | null;
  C: Theme;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [supplierId, setSupplierId] = useState(editOrder?.supplierId || '');
  const [expectedDate, setExpectedDate] = useState(editOrder?.expectedDate || '');
  const [notes, setNotes] = useState(editOrder?.notes || '');
  const [lines, setLines] = useState<OrderLineForm[]>(editOrder?.lines.map(l => ({
    ...l, productName: l.productName || '', pricePerUnit: l.pricePerUnit || 0, supplierSku: l.supplierSku || ''
  } as OrderLineForm)) || []);
  const [saving, setSaving] = useState(false);
  const [catalogOffers, setCatalogOffers] = useState<Record<string, SupplierCatalogOffer>>({});

  useEffect(() => {
    if (supplierId) loadOffers(supplierId);
  }, [supplierId]);

  async function loadOffers(sid: string) {
    try {
      const r = await fetch(`/api/supplier-catalog?supplierId=${sid}`);
      if (r.ok) {
        const offers: SupplierCatalogOffer[] = await r.json();
        const map: Record<string, SupplierCatalogOffer> = {};
        for (const o of offers) map[o.productId] = o;
        setCatalogOffers(map);
      }
    } catch {}
  }

  function addLine() {
    setLines(l => [...l, { productId: '', productName: '', quantity: 1, pricePerUnit: 0, supplierSku: '' }]);
  }

  function updateLine(i: number, field: string, value: string) {
    setLines(l => {
      const n = [...l];
      (n[i] as unknown as Record<string, string | number>)[field] = value;
      if (field === 'productId' && catalogOffers[value]) {
        n[i].pricePerUnit = catalogOffers[value].price;
        n[i].supplierSku = catalogOffers[value].sku || '';
        n[i].productName = catalogOffers[value].productName || nonElaborados.find(p => p.id === value)?.name || '';
      }
      if (field === 'productId' && !n[i].productName) {
        n[i].productName = nonElaborados.find(p => p.id === value)?.name || '';
      }
      return n;
    });
  }

  function removeLine(i: number) {
    setLines(l => l.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!supplierId) return;
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      const action = editOrder ? 'update-lines' : 'create';
      const body: Record<string, unknown> = {
        action,
        supplierId,
        supplierName: supplier?.name || '',
        expectedDate,
        notes,
        lines: lines.map(l => ({
          productId: l.productId, productName: l.productName,
          quantity: Number(l.quantity) || 1, pricePerUnit: Number(l.pricePerUnit) || 0,
          supplierSku: l.supplierSku || '',
        })),
        createdBy: 'admin',
      };
      if (editOrder) body.id = editOrder.id;
      const r = await fetch('/api/purchase-orders', { method: 'POST', body: JSON.stringify(body) });
      if (r.ok) onSaved();
    } catch {}
    setSaving(false);
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.pricePerUnit) || 0), 0);

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
      <h3 className="text-sm font-bold" style={{ color: C.cream }}>{editOrder ? 'Editar pedido' : 'Nuevo pedido'}</h3>

      <div className="grid grid-cols-2 gap-3">
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}>
          <option value="">Seleccionar proveedor</option>
          {suppliers.filter(s => s.active).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
      </div>

      <div className="space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <select value={l.productId} onChange={e => updateLine(i, 'productId', e.target.value)}
              className="flex-1 rounded-lg px-2 py-1.5 text-[10px]"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}>
              <option value="">Seleccionar artículo</option>
              {nonElaborados.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input type="number" step="0.01" value={l.quantity} min={0}
              onChange={e => updateLine(i, 'quantity', e.target.value)}
              className="w-16 text-center rounded-lg px-2 py-1.5 text-[10px]"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
            <input type="number" step="0.001" value={l.pricePerUnit} min={0}
              onChange={e => updateLine(i, 'pricePerUnit', e.target.value)}
              className="w-20 text-center rounded-lg px-2 py-1.5 text-[10px]"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
            <span className="font-mono w-14 text-right" style={{ color: C.brassLight }}>
              {((Number(l.quantity) || 0) * (Number(l.pricePerUnit) || 0)).toFixed(2)}
            </span>
            <button onClick={() => removeLine(i)} style={{ color: C.wineLight }}><X className="w-3 h-3" /></button>
          </div>
        ))}
      </div>

      <button onClick={addLine}
        className="flex items-center gap-1 text-[10px] font-medium hover:opacity-80"
        style={{ color: C.brassLight }}>
        <Plus className="w-3 h-3" /> Añadir línea
      </button>

      <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
        <span className="text-sm font-bold" style={{ color: C.cream }}>Total: {total.toFixed(2)}€</span>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: C.surface, color: C.muted }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !supplierId}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40"
            style={{ background: C.sage + '30', color: C.sage }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
