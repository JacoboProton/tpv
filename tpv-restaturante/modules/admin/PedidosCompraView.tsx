'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Send, Truck, Download, Eye, Settings, Loader2, Search, Euro, Package, AlertTriangle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Theme } from '@/components/constants';

interface PurchaseOrderLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  supplierSku: string;
  receivedQty: number;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: string;
  expectedDate: string;
  notes: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number | null;
  lines: PurchaseOrderLine[];
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  nif: string;
  address: string;
  paymentTerms: string;
  notes: string;
  active: boolean;
  createdAt: number;
}

interface CatalogProduct {
  id: string;
  name: string;
  type: string;
}

interface SupplierCatalogOffer {
  id: string;
  productId: string;
  productName: string;
  price: number;
  sku: string;
  packSize: number;
  minOrder: number;
  isPreferred: boolean;
  active: boolean;
  deliveryDays: number;
  pricePerUnit: number;
  trend: number | null;
  prevPrice: number | null;
}

interface PreviewGroup {
  supplierId: string;
  supplierName: string;
  lines: { productId: string; productName: string; quantity: number; pricePerUnit: number; supplierSku: string }[];
  total: number;
}

interface PreviewData {
  preview: PreviewGroup[];
  noOfferProducts: { id: string; name: string }[];
  skippedByMin: { supplierName: string; total: number; minOrderValue: number }[];
}

interface GenResult {
  ok: boolean;
  created: { id: string; supplierName: string; lineCount: number }[];
  noOfferProducts: { id: string; name: string }[];
  skippedByMin: { supplierName: string; total: number; minOrderValue: number }[];
}

interface AutoSettings {
  leadTimeDays: string;
  safetyStockDays: string;
  minOrderValue: string;
  consolidateBySupplier: string;
}

const ORDER_STATUS = ['draft', 'sent', 'partial', 'received'];
const STATUS_LABELS: Record<string, string> = { draft: 'Borrador', sent: 'Enviado', partial: 'Recibido parcial', received: 'Recibido' };
const STATUS_COLORS: Record<string, string> = { draft: '#8a8275', sent: '#c4a04a', partial: '#6a9af8', received: '#7a9a7c' };

interface PedidosCompraViewProps {
  colors: Theme;
}

export default function PedidosCompraView({ colors: C }: PedidosCompraViewProps) {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalog, setCatalog] = useState<{ products: CatalogProduct[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [oRes, sRes, cRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/suppliers'),
        fetch('/api/catalog'),
      ]);
      if (oRes.ok) setOrders(await oRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
      if (cRes.ok) setCatalog(await cRes.json());
    } catch {}
    setLoading(false);
  }

  const nonElaborados = useMemo(() => {
    if (!catalog?.products) return [] as CatalogProduct[];
    return catalog.products.filter((p: CatalogProduct) => p.type !== 'elaborado');
  }, [catalog]);

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: C.line }}>
        {[
          { id: 'orders', label: 'Pedidos', icon: Package },
          { id: 'auto', label: 'Automáticos', icon: Settings },
          { id: 'suppliers', label: 'Proveedores', icon: Truck },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: tab === t.id ? C.surfaceLight : 'transparent', color: tab === t.id ? C.brassLight : C.muted }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <OrdersTab orders={orders} suppliers={suppliers} catalog={catalog} nonElaborados={nonElaborados} C={C} onRefresh={loadAll} />}
      {tab === 'auto' && <AutoTab suppliers={suppliers} nonElaborados={nonElaborados} C={C} onRefresh={loadAll} />}
      {tab === 'suppliers' && <SuppliersTab suppliers={suppliers} catalog={catalog} nonElaborados={nonElaborados} C={C} onRefresh={loadAll} />}
    </div>
  );
}

function OrdersTab({ orders, suppliers, catalog, nonElaborados, C, onRefresh }: {
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

interface OrderLineForm {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  supplierSku: string;
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
  const [products, setProducts] = useState(nonElaborados);

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
        n[i].productName = catalogOffers[value].productName || products.find(p => p.id === value)?.name || '';
      }
      if (field === 'productId' && !n[i].productName) {
        n[i].productName = products.find(p => p.id === value)?.name || '';
      }
      return n;
    });
  }

  function removeLine(i: number) {
    setLines(l => l.filter((_, idx) => idx !== i));
  }

  function cheapestOtherOffer(productId: string, currentSupplierId: string) {
    if (!catalogOffers[productId]) return null;
    return catalogOffers[productId];
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
              {products.map(p => (
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

function AutoTab({ suppliers, nonElaborados, C, onRefresh }: {
  suppliers: Supplier[];
  nonElaborados: CatalogProduct[];
  C: Theme;
  onRefresh: () => void;
}) {
  const [settings, setSettings] = useState<AutoSettings>({ leadTimeDays: '2', safetyStockDays: '3', minOrderValue: '50', consolidateBySupplier: 'true' });
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenResult | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const r = await fetch('/api/auto-order-settings');
      if (r.ok) setSettings(await r.json());
    } catch {}
    setLoading(false);
  }

  async function saveSettings() {
    try {
      await fetch('/api/auto-order-settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
    } catch {}
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreview(null);
    setGenResult(null);
    try {
      const r = await fetch('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ action: 'auto-preview', ...settings }),
      });
      if (r.ok) setPreview(await r.json());
    } catch {}
    setPreviewLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenResult(null);
    try {
      const r = await fetch('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ action: 'auto-generate', ...settings, createdBy: 'admin' }),
      });
      if (r.ok) {
        const data: GenResult = await r.json();
        setGenResult(data);
        setPreview(null);
        onRefresh();
      }
    } catch {}
    setGenerating(false);
  }

  if (loading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>;

  const allProducts = preview?.preview?.flatMap(g => g.lines) || [];
  const allTotal = preview?.preview?.reduce((s, g) => s + g.total, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 space-y-3" style={{ background: C.surfaceLight }}>
        <h4 className="text-xs font-bold" style={{ color: C.cream }}>Ajustes</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <label style={{ color: C.muted }}>Plazo de entrega (días)
            <input type="number" min={1} value={settings.leadTimeDays}
              onChange={e => setSettings(s => ({ ...s, leadTimeDays: e.target.value }))}
              className="w-full mt-1 rounded-lg px-3 py-2 text-xs"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          </label>
          <label style={{ color: C.muted }}>Stock de seguridad (días)
            <input type="number" min={0} value={settings.safetyStockDays}
              onChange={e => setSettings(s => ({ ...s, safetyStockDays: e.target.value }))}
              className="w-full mt-1 rounded-lg px-3 py-2 text-xs"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          </label>
          <label style={{ color: C.muted }}>Valor mínimo pedido (€)
            <input type="number" min={0} step={5} value={settings.minOrderValue}
              onChange={e => setSettings(s => ({ ...s, minOrderValue: e.target.value }))}
              className="w-full mt-1 rounded-lg px-3 py-2 text-xs"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          </label>
          <label className="flex items-center gap-2 pt-4" style={{ color: C.muted }}>
            <input type="checkbox" checked={settings.consolidateBySupplier === 'true'}
              onChange={e => setSettings(s => ({ ...s, consolidateBySupplier: e.target.checked ? 'true' : 'false' }))} />
            Consolidar por proveedor
          </label>
        </div>
        <button onClick={saveSettings}
          className="px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
          style={{ background: C.surface, color: C.brassLight }}>
          Guardar ajustes
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={handlePreview} disabled={previewLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-40"
          style={{ background: C.brass + '30', color: C.brassLight }}>
          {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
          Previsualizar
        </button>
        {preview && (
          <button onClick={handleGenerate} disabled={generating || preview.preview.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-40"
            style={{ background: C.sage + '30', color: C.sage }}>
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Generar {preview.preview.length} pedidos
          </button>
        )}
      </div>

      {previewLoading && <p className="text-xs text-center" style={{ color: C.muted }}>Calculando previsión…</p>}

      {preview && (
        <div className="space-y-3">
          {preview.preview.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: C.muted }}>No se generará ningún pedido (todo por debajo del mínimo o sin necesidad).</p>
          )}

          {preview.preview.map(group => (
            <div key={group.supplierId} className="rounded-xl p-4 space-y-2" style={{ background: C.surfaceLight }}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm" style={{ color: C.cream }}>{group.supplierName}</span>
                <span className="text-sm font-mono" style={{ color: C.brassLight }}>{group.total.toFixed(2)}€</span>
              </div>
              <div className="space-y-1">
                {group.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span style={{ color: C.cream }}>{l.productName}</span>
                    <span style={{ color: C.muted }}>{l.quantity} ud × {l.pricePerUnit.toFixed(4)}€</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {preview.noOfferProducts?.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: C.wine + '20', border: `1px solid ${C.wineLight}40` }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: C.wineLight }}>Sin oferta de proveedor</p>
              {preview.noOfferProducts.map(p => (
                <p key={p.id} className="text-[10px]" style={{ color: C.muted }}>• {p.name}</p>
              ))}
            </div>
          )}

          {preview.skippedByMin?.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: C.brass + '20', border: `1px solid ${C.brass}40` }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: C.brassLight }}>Saltados por valor mínimo ({preview.skippedByMin[0]?.minOrderValue}€)</p>
              {preview.skippedByMin.map(s => (
                <p key={s.supplierName} className="text-[10px]" style={{ color: C.muted }}>• {s.supplierName} — {s.total.toFixed(2)}€</p>
              ))}
            </div>
          )}

          {preview.preview.length > 0 && (
            <p className="text-xs text-center" style={{ color: C.muted }}>
              {allProducts.length} productos · {preview.preview.length} proveedores · {allTotal.toFixed(2)}€ total
            </p>
          )}
        </div>
      )}

      {genResult && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: C.sage + '20', border: `1px solid ${C.sage}40` }}>
          <p className="text-xs font-bold" style={{ color: C.sage }}>Pedidos generados</p>
          {genResult.created.map(c => (
            <p key={c.id} className="text-[10px]" style={{ color: C.cream }}>✅ {c.supplierName} — {c.lineCount} líneas</p>
          ))}
          {genResult.noOfferProducts?.length > 0 && (
            <p className="text-[10px]" style={{ color: C.wineLight }}>⚠️ {genResult.noOfferProducts.length} artículos sin proveedor</p>
          )}
          {genResult.skippedByMin?.length > 0 && (
            <p className="text-[10px]" style={{ color: C.brassLight }}>⚠️ {genResult.skippedByMin.length} proveedores bajo mínimo</p>
          )}
        </div>
      )}
    </div>
  );
}

function SuppliersTab({ suppliers, catalog, nonElaborados, C, onRefresh }: {
  suppliers: Supplier[];
  catalog: { products: CatalogProduct[] } | null;
  nonElaborados: CatalogProduct[];
  C: Theme;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [showOffers, setShowOffers] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => { setShowForm(true); setEditSupplier(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
          style={{ background: C.sage + '30', color: C.sage }}>
          <Plus className="w-3.5 h-3.5" /> Nuevo proveedor
        </button>
      </div>

      {(showForm || editSupplier) && (
        <SupplierForm supplier={editSupplier} C={C}
          onClose={() => { setShowForm(false); setEditSupplier(null); }}
          onSaved={() => { onRefresh(); setShowForm(false); setEditSupplier(null); }} />
      )}

      {suppliers.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: C.muted }}>Sin proveedores</p>
      ) : (
        <div className="space-y-2">
          {suppliers.map(s => (
            <SupplierCard key={s.id} supplier={s} C={C}
              onEdit={() => setEditSupplier(s)}
              showOffersId={showOffers}
              onShowOffers={() => setShowOffers(showOffers === s.id ? null : s.id)}
              catalog={catalog}
              nonElaborados={nonElaborados}
              onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierCard({ supplier: s, C, onEdit, showOffersId, onShowOffers, catalog, nonElaborados, onRefresh }: {
  supplier: Supplier;
  C: Theme;
  onEdit: () => void;
  showOffersId: string | null;
  onShowOffers: () => void;
  catalog: { products: CatalogProduct[] } | null;
  nonElaborados: CatalogProduct[];
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: C.surfaceLight }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm" style={{ color: C.cream }}>{s.name}</span>
            {!s.active && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.wine + '30', color: C.wineLight }}>Inactivo</span>}
          </div>
          {s.contact && <p className="text-[10px]" style={{ color: C.muted }}>{s.contact}</p>}
          {s.phone && <p className="text-[10px]" style={{ color: C.muted }}>{s.phone}</p>}
          {s.nif && <p className="text-[10px]" style={{ color: C.muted }}>NIF: {s.nif}</p>}
        </div>
        <div className="flex gap-1.5">
          <button onClick={onShowOffers}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: C.surface, color: C.brassLight }}>
            Catálogo
          </button>
          <button onClick={onEdit}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: C.surface, color: C.muted }}>
            Editar
          </button>
        </div>
      </div>

      {showOffersId === s.id && (
        <SupplierOffers supplier={s} C={C} nonElaborados={nonElaborados} onRefresh={onRefresh} />
      )}
    </div>
  );
}

function SupplierOffers({ supplier, C, nonElaborados, onRefresh }: {
  supplier: Supplier;
  C: Theme;
  nonElaborados: CatalogProduct[];
  onRefresh: () => void;
}) {
  const [offers, setOffers] = useState<SupplierCatalogOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOffer, setNewOffer] = useState<{ productId: string; sku: string; price: string; packSize: number; minOrder: number } | null>(null);

  useEffect(() => {
    loadOffers();
  }, [supplier.id]);

  async function loadOffers() {
    try {
      const r = await fetch(`/api/supplier-catalog?supplierId=${supplier.id}`);
      if (r.ok) setOffers(await r.json());
    } catch {}
    setLoading(false);
  }

  async function saveOffer(offer: Record<string, unknown>) {
    try {
      await fetch('/api/supplier-catalog', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', ...offer, supplierId: supplier.id }),
      });
      loadOffers();
    } catch {}
  }

  async function deleteOffer(id: string) {
    try {
      await fetch('/api/supplier-catalog', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id }),
      });
      loadOffers();
    } catch {}
  }

  function startNewOffer() {
    setNewOffer({ productId: '', sku: '', price: '', packSize: 1, minOrder: 0 });
  }

  async function saveNewOffer() {
    if (!newOffer!.productId || !newOffer!.price) return;
    await saveOffer({
      productId: newOffer!.productId,
      sku: newOffer!.sku,
      price: Number(newOffer!.price),
      packSize: Number(newOffer!.packSize) || 1,
      minOrder: Number(newOffer!.minOrder) || 0,
    });
    setNewOffer(null);
  }

  if (loading) return <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.brassLight }} />;

  const productsNotInCatalog = nonElaborados.filter(p => !offers.find(o => o.productId === p.id));

  return (
    <div className="space-y-2 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
      <p className="text-[10px] font-medium" style={{ color: C.cream }}>Ofertas del catálogo</p>
      {offers.map(o => (
        <OfferRow key={o.id} offer={o} C={C} onSave={saveOffer} onDelete={deleteOffer} />
      ))}

      {newOffer && (
        <div className="flex items-center gap-1.5 text-[10px]">
          <select value={newOffer.productId} onChange={e => setNewOffer(no => ({ ...no!, productId: e.target.value }))}
            className="flex-1 rounded-lg px-2 py-1.5"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}>
            <option value="">Seleccionar</option>
            {productsNotInCatalog.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="text" value={newOffer.sku} onChange={e => setNewOffer(no => ({ ...no!, sku: e.target.value }))}
            placeholder="SKU" className="w-16 rounded-lg px-2 py-1.5 text-center"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          <input type="number" step="0.001" value={newOffer.price} onChange={e => setNewOffer(no => ({ ...no!, price: e.target.value }))}
            placeholder="Precio" className="w-20 rounded-lg px-2 py-1.5 text-center"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          <button onClick={saveNewOffer} style={{ color: C.sage }}><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setNewOffer(null)} style={{ color: C.wineLight }}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {offers.length === 0 && !newOffer && (
        <p className="text-[10px]" style={{ color: C.muted }}>Sin ofertas. Añade productos al catálogo.</p>
      )}
      <button onClick={startNewOffer} className="text-[10px] flex items-center gap-1 hover:opacity-80" style={{ color: C.brassLight }}>
        <Plus className="w-3 h-3" /> Añadir producto al catálogo
      </button>
    </div>
  );
}

function OfferRow({ offer: o, C, onSave, onDelete }: {
  offer: SupplierCatalogOffer;
  C: Theme;
  onSave: (data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [price, setPrice] = useState(o.price);
  const [sku, setSku] = useState(o.sku);
  const [packSize, setPackSize] = useState(o.packSize);

  function handleSave() {
    onSave({ id: o.id, sku, price, packSize, minOrder: o.minOrder, active: true });
    setEdit(false);
  }

  if (edit) {
    return (
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="w-24" style={{ color: C.cream }}>{o.productName}</span>
        <input type="text" value={sku} onChange={e => setSku(e.target.value)}
          className="w-14 rounded-lg px-2 py-1 text-center"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="number" step="0.001" value={price} onChange={e => setPrice(Number(e.target.value))}
          className="w-20 rounded-lg px-2 py-1 text-center"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="number" step="0.01" value={packSize} onChange={e => setPackSize(Number(e.target.value))}
          className="w-14 rounded-lg px-2 py-1 text-center"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <button onClick={handleSave} style={{ color: C.sage }}><Check className="w-3 h-3" /></button>
        <button onClick={() => setEdit(false)} style={{ color: C.wineLight }}><X className="w-3 h-3" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-[10px]">
      <span style={{ color: C.cream }}>{o.productName}</span>
      <div className="flex items-center gap-2">
        {o.sku && <span style={{ color: C.muted }}>SKU: {o.sku}</span>}
        <span style={{ color: C.brassLight }}>
          {o.isPreferred && <span className="mr-1" style={{ color: C.sage }}>★</span>}
          {o.price.toFixed(4)}€
        </span>
        <span className="text-[9px]" style={{ color: C.muted }}>pack: {o.packSize}</span>
        <span className="text-[9px] font-mono" style={{ color: C.muted }}>
          ({(o.price / (o.packSize || 1)).toFixed(4)}/ud)
        </span>
        {o.trend !== null && (
          <span className="text-[9px] font-medium" style={{ color: o.trend >= 0 ? C.wineLight : C.sage }}
            title={o.prevPrice ? `Anterior: ${o.prevPrice.toFixed(4)}€/ud` : ''}>
            {o.trend >= 0 ? '▲' : '▼'} {Math.abs(o.trend).toFixed(1)}%
          </span>
        )}
        {o.deliveryDays > 0 && (
          <span className="text-[9px]" style={{ color: C.muted }}>{o.deliveryDays}d</span>
        )}
        <button onClick={() => setEdit(true)} className="hover:opacity-80" style={{ color: C.muted }}>✎</button>
        <button onClick={() => onDelete(o.id)} className="hover:opacity-80" style={{ color: C.wineLight }}><X className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

function SupplierForm({ supplier, C, onClose, onSaved }: {
  supplier: Supplier | null;
  C: Theme;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(supplier?.name || '');
  const [contact, setContact] = useState(supplier?.contact || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [nif, setNif] = useState(supplier?.nif || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms || '');
  const [notes, setNotes] = useState(supplier?.notes || '');
  const [active, setActive] = useState(supplier?.active !== false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        action: 'save', name, contact, phone, email, nif, address, paymentTerms, notes, active,
      };
      if (supplier) body.id = supplier.id;
      await fetch('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch {}
    setSaving(false);
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre *" required
          className="rounded-lg px-3 py-2"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="Contacto"
          className="rounded-lg px-3 py-2"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono"
          className="rounded-lg px-3 py-2"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
          className="rounded-lg px-3 py-2"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="text" value={nif} onChange={e => setNif(e.target.value)} placeholder="CIF/NIF"
          className="rounded-lg px-3 py-2"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección"
          className="rounded-lg px-3 py-2"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="text" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Condiciones de pago"
          className="rounded-lg px-3 py-2"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas" rows={2}
        className="w-full rounded-lg px-3 py-2 text-xs resize-none"
        style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
      <label className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        Proveedor activo
      </label>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: C.surface, color: C.muted }}>Cancelar</button>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40"
          style={{ background: C.sage + '30', color: C.sage }}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Guardar
        </button>
      </div>
    </div>
  );
}
