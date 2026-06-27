'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Truck, Calendar, Euro, Check, X, ChevronDown, ChevronUp, Loader2, Search, Package, AlertTriangle, Ban, Trash2 } from 'lucide-react';

export default function AlbaranesView({ colors: C }) {
  const [albaranes, setAlbaranes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [voidingId, setVoidingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [aRes, sRes, poRes, cRes] = await Promise.all([
        fetch('/api/albaranes'),
        fetch('/api/suppliers'),
        fetch('/api/purchase-orders'),
        fetch('/api/catalog'),
      ]);
      if (aRes.ok) setAlbaranes(await aRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
      if (poRes.ok) {
        const pos = await poRes.json();
        setPurchaseOrders(pos.filter(po => po.status !== 'received'));
      }
      if (cRes.ok) setCatalog(await cRes.json());
    } catch {}
    setLoading(false);
  }

  const nonElaborados = catalog?.products?.filter(p => p.type !== 'elaborado') || [];
  const filtered = albaranes.filter(a => 
    (statusFilter === 'all' || a.status === statusFilter) &&
    (!searchQuery || 
    a.albaranNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.supplierName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>ALBARANES</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); }}
          style={{ background: C.sage, color: '#fff' }}
          className="text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Nuevo albarán
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por número o proveedor..."
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="rounded-lg px-3 py-2 text-sm flex-1"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
          <option value="all">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="confirmed">Confirmado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      {(showForm || editId) && (
        <AlbaranForm 
          suppliers={suppliers} 
          purchaseOrders={purchaseOrders}
          nonElaborados={nonElaborados} 
          editAlbaran={editId ? albaranes.find(a => a.id === editId) : null} 
          C={C}
          onClose={() => { setShowForm(false); setEditId(null); }} 
          onSaved={() => { loadAll(); setShowForm(false); setEditId(null); }} 
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: C.muted }}>Sin albaranes</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <AlbaranCard 
              key={a.id} 
              albaran={a} 
              C={C} 
              onEdit={() => setEditId(a.id)} 
              onRefresh={loadAll} 
              onConfirm={() => handleConfirm(a)}
              onVoid={() => handleVoid(a)}
              onDelete={() => handleDelete(a)}
              processing={processingId === a.id}
              voiding={voidingId === a.id}
            />
          ))}
        </div>
      )}
    </div>
  );

  async function handleConfirm(albaran) {
    if (!confirm(`¿Confirmar albarán ${albaran.albaranNumber}? Esto actualizará el stock, ajustará los costes y creará los lotes.`)) return;
    
    setProcessingId(albaran.id);
    try {
      const lines = albaran.lines;
      const batches = lines.map(line => ({
        productId: line.productId,
        productName: line.productName,
        location: 'Almacén',
        expiryDate: line.expiryDate || '',
        batchNumber: line.batchNumber || `${albaran.albaranNumber}-${line.id}`
      }));
      
      const r = await fetch('/api/albaranes', {
        method: 'POST',
        body: JSON.stringify({ action: 'confirm', id: albaran.id, batches }),
      });
      if (r.ok) {
        alert('Albarán confirmado correctamente');
        loadAll();
      } else {
        const err = await r.json();
        alert('Error al confirmar: ' + (err.error || 'Error desconocido'));
      }
    } catch (err) {
      alert('Error al confirmar albarán: ' + err.message);
    }
    setProcessingId(null);
  }

  async function handleVoid(albaran) {
    const reason = prompt('Motivo de la anulación (opcional):');
    if (reason === null) return;
    
    setVoidingId(albaran.id);
    try {
      const r = await fetch('/api/albaranes', {
        method: 'POST',
        body: JSON.stringify({ action: 'void', id: albaran.id, reason, anuladoBy: 'Usuario' }),
      });
      if (r.ok) {
        alert('Albarán anulado correctamente');
        loadAll();
      } else {
        const err = await r.json();
        alert('Error al anular: ' + (err.error || 'Error desconocido'));
      }
    } catch (err) {
      alert('Error al anular albarán: ' + err.message);
    }
    setVoidingId(null);
  }

  async function handleDelete(albaran) {
    if (!confirm(`¿Eliminar albarán ${albaran.albaranNumber}? Esta acción no se puede deshacer.`)) return;
    
    try {
      const r = await fetch('/api/albaranes', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id: albaran.id }),
      });
      if (r.ok) {
        loadAll();
      } else {
        const err = await r.json();
        alert('Error al eliminar: ' + (err.error || 'Error desconocido'));
      }
    } catch (err) {
      alert('Error al eliminar albarán: ' + err.message);
    }
  }
}

function AlbaranCard({ albaran: a, C, onEdit, onConfirm, onVoid, onDelete, processing, voiding }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    draft: { bg: C.surface, text: C.muted, label: 'Borrador' },
    confirmed: { bg: C.sage + '30', text: C.sage, label: 'Confirmado' },
    anulado: { bg: C.wine + '30', text: C.wine, label: 'Anulado' }
  };
  const statusStyle = statusColors[a.status] || statusColors.draft;

  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, opacity: a.status === 'anulado' ? 0.6 : 1 }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: C.brassLight }} />
            <span className="font-medium text-sm" style={{ color: C.cream }}>{a.albaranNumber}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: statusStyle.bg, color: statusStyle.text }}>{statusStyle.label}</span>
            {a.invoiceNumber && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: C.sage + '30', color: C.sage }}>Factura: {a.invoiceNumber}</span>}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
            {a.supplierName} · {a.deliveryDate}
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-mono" style={{ color: C.brassLight }}>{a.totalAmount.toFixed(2)}€</span>
          {a.headerDiscountPct > 0 && <p className="text-[9px]" style={{ color: C.muted }}>-{a.headerDiscountPct}% desc.</p>}
        </div>
      </div>

      <div className="flex gap-1.5">
        {a.status === 'draft' && (
          <>
            <button onClick={onEdit}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
              style={{ background: C.surface, color: C.muted }}>
              Editar
            </button>
            <button onClick={onConfirm}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
              style={{ background: C.sage + '30', color: C.sage }}>
              {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {processing ? 'Confirmando...' : 'Confirmar'}
            </button>
            <button onClick={onDelete}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
              style={{ background: C.wine + '30', color: C.wine }}>
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
        {a.status === 'confirmed' && (
          <button onClick={onVoid}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
              style={{ background: C.wine + '30', color: C.wine }}>
              {voiding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
              {voiding ? 'Anulando...' : 'Anular'}
            </button>
        )}
        {a.status === 'anulado' && a.anuladoReason && (
          <p className="text-[10px]" style={{ color: C.wine }}>Motivo: {a.anuladoReason}</p>
        )}
        <div className="flex-1" />
        <button onClick={() => setExpanded(!expanded)} style={{ color: C.muted }}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-1 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
          {a.lines.map(l => (
            <div key={l.id} className="flex items-center justify-between text-[10px]">
              <div className="flex-1">
                <span style={{ color: C.cream }}>{l.productName}</span>
                <span className="ml-2" style={{ color: C.muted }}>SKU: {l.supplierSku || '—'}</span>
                {l.packSize > 1 && <span className="ml-1" style={{ color: C.muted }}>(×{l.packSize})</span>}
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: C.muted }}>{l.quantity} × {l.pricePerPack.toFixed(4)}€</span>
                {l.lineDiscountPct > 0 && <span style={{ color: C.wine }}>-{l.lineDiscountPct}%</span>}
                {l.ivaPct > 0 && <span style={{ color: C.muted }}>IVA {l.ivaPct}%</span>}
                <span className="font-mono w-16 text-right" style={{ color: C.brassLight }}>{l.totalLine.toFixed(2)}€</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-[10px] pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
            <span style={{ color: C.muted }}>Base imponible:</span>
            <span className="font-mono" style={{ color: C.cream }}>{a.totalNet.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span style={{ color: C.muted }}>IVA:</span>
            <span className="font-mono" style={{ color: C.cream }}>{a.totalIva.toFixed(2)}€</span>
          </div>
          {a.headerDiscountPct > 0 && (
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.muted }}>Descuento cabecera:</span>
              <span className="font-mono" style={{ color: C.wine }}>-{a.headerDiscountAmount.toFixed(2)}€</span>
            </div>
          )}
          {a.recargoAmount > 0 && (
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.muted }}>Recargo equivalencia:</span>
              <span className="font-mono" style={{ color: C.cream }}>{a.recargoAmount.toFixed(2)}€</span>
            </div>
          )}
          {a.portesAmount > 0 && (
            <div className="flex justify-between text-[10px]">
              <span style={{ color: C.muted }}>Portes:</span>
              <span className="font-mono" style={{ color: C.cream }}>{a.portesAmount.toFixed(2)}€</span>
            </div>
          )}
          {a.notes && (
            <p className="text-[10px] mt-2 pt-2" style={{ borderTop: `1px solid ${C.line}`, color: C.muted }}>
              Notas: {a.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AlbaranForm({ suppliers, purchaseOrders, nonElaborados, editAlbaran, C, onClose, onSaved }) {
  const [supplierId, setSupplierId] = useState(editAlbaran?.supplierId || '');
  const [albaranNumber, setAlbaranNumber] = useState(editAlbaran?.albaranNumber || `ALB-${Date.now()}`);
  const [deliveryDate, setDeliveryDate] = useState(editAlbaran?.deliveryDate || new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(editAlbaran?.invoiceNumber || '');
  const [notes, setNotes] = useState(editAlbaran?.notes || '');
  const [receivedBy, setReceivedBy] = useState(editAlbaran?.receivedBy || '');
  const [headerDiscountPct, setHeaderDiscountPct] = useState(editAlbaran?.headerDiscountPct || 0);
  const [recargoEquivalenciaPct, setRecargoEquivalenciaPct] = useState(editAlbaran?.recargoEquivalenciaPct || 0);
  const [portesAmount, setPortesAmount] = useState(editAlbaran?.portesAmount || 0);
  const [linkedPurchaseOrderId, setLinkedPurchaseOrderId] = useState(editAlbaran?.linkedPurchaseOrderId || '');
  const [lines, setLines] = useState(editAlbaran?.lines.map(l => ({
    ...l, productName: l.productName || '', pricePerPack: l.pricePerPack || l.pricePerUnit || 0, packSize: l.packSize || 1, ivaPct: l.ivaPct || 0, lineDiscountPct: l.lineDiscountPct || 0, supplierSku: l.supplierSku || '', batchNumber: l.batchNumber || '', expiryDate: l.expiryDate || ''
  })) || []);
  const [saving, setSaving] = useState(false);
  const [catalogOffers, setCatalogOffers] = useState({});

  useEffect(() => {
    if (supplierId) loadOffers(supplierId);
  }, [supplierId]);

  async function loadOffers(sid) {
    try {
      const r = await fetch(`/api/supplier-catalog?supplierId=${sid}`);
      if (r.ok) {
        const offers = await r.json();
        const map = {};
        for (const o of offers) map[o.productId] = o;
        setCatalogOffers(map);
      }
    } catch {}
  }

  function addLine() {
    setLines(l => [...l, { productId: '', productName: '', quantity: 1, packSize: 1, pricePerPack: 0, ivaPct: 21, lineDiscountPct: 0, supplierSku: '', batchNumber: '', expiryDate: '' }]);
  }

  function updateLine(i, field, value) {
    setLines(l => {
      const n = [...l];
      n[i] = { ...n[i], [field]: value };
      if (field === 'productId' && catalogOffers[value]) {
        n[i].pricePerPack = catalogOffers[value].price;
        n[i].supplierSku = catalogOffers[value].sku || '';
        n[i].productName = catalogOffers[value].productName || nonElaborados.find(p => p.id === value)?.name || '';
      }
      if (field === 'productId' && !n[i].productName) {
        n[i].productName = nonElaborados.find(p => p.id === value)?.name || '';
      }
      if (field === 'packSize' || field === 'pricePerPack') {
        const packSize = parseFloat(n[i].packSize) || 1;
        const pricePerPack = parseFloat(n[i].pricePerPack) || 0;
        n[i].pricePerUnit = pricePerPack / packSize;
      }
      return n;
    });
  }

  function removeLine(i) {
    setLines(l => l.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!supplierId || !albaranNumber) return;
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      const action = editAlbaran ? 'update' : 'create';
      const body = {
        action,
        supplierId,
        supplierName: supplier?.name || '',
        albaranNumber,
        deliveryDate,
        invoiceNumber,
        notes,
        receivedBy,
        headerDiscountPct,
        recargoEquivalenciaPct,
        portesAmount,
        linkedPurchaseOrderId,
        lines: lines.map(l => ({
          productId: l.productId, productName: l.productName,
          quantity: parseFloat(l.quantity) || 1, packSize: parseFloat(l.packSize) || 1,
          pricePerPack: parseFloat(l.pricePerPack) || 0, pricePerUnit: parseFloat(l.pricePerUnit) || 0,
          ivaPct: parseFloat(l.ivaPct) || 0, lineDiscountPct: parseFloat(l.lineDiscountPct) || 0,
          supplierSku: l.supplierSku || '', batchNumber: l.batchNumber || '', expiryDate: l.expiryDate || '',
        })),
      };
      if (editAlbaran) body.id = editAlbaran.id;
      const r = await fetch('/api/albaranes', { method: 'POST', body: JSON.stringify(body) });
      if (r.ok) {
        onSaved();
      } else {
        const err = await r.json();
        alert('Error: ' + (err.error || 'Error desconocido'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSaving(false);
  }

  const supplier = suppliers.find(s => s.id === supplierId);
  const calculateLineTotal = (l) => {
    const qty = parseFloat(l.quantity) || 0;
    const packSize = parseFloat(l.packSize) || 1;
    const pricePerPack = parseFloat(l.pricePerPack) || 0;
    const lineDiscountPct = parseFloat(l.lineDiscountPct) || 0;
    const ivaPct = parseFloat(l.ivaPct) || 0;
    const subtotal = qty * pricePerPack;
    const lineDiscountAmount = subtotal * (lineDiscountPct / 100);
    const afterLineDiscount = subtotal - lineDiscountAmount;
    const ivaAmount = afterLineDiscount * (ivaPct / 100);
    return afterLineDiscount + ivaAmount;
  };
  const totalNet = lines.reduce((s, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const packSize = parseFloat(l.packSize) || 1;
    const pricePerPack = parseFloat(l.pricePerPack) || 0;
    const lineDiscountPct = parseFloat(l.lineDiscountPct) || 0;
    const subtotal = qty * pricePerPack;
    const lineDiscountAmount = subtotal * (lineDiscountPct / 100);
    return s + (subtotal - lineDiscountAmount);
  }, 0);
  const totalIva = lines.reduce((s, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const packSize = parseFloat(l.packSize) || 1;
    const pricePerPack = parseFloat(l.pricePerPack) || 0;
    const lineDiscountPct = parseFloat(l.lineDiscountPct) || 0;
    const ivaPct = parseFloat(l.ivaPct) || 0;
    const subtotal = qty * pricePerPack;
    const lineDiscountAmount = subtotal * (lineDiscountPct / 100);
    const afterLineDiscount = subtotal - lineDiscountAmount;
    return s + (afterLineDiscount * (ivaPct / 100));
  }, 0);
  const headerDiscountAmount = totalNet * (parseFloat(headerDiscountPct) / 100);
  const afterHeaderDiscount = totalNet - headerDiscountAmount;
  const recargoAmount = afterHeaderDiscount * (parseFloat(recargoEquivalenciaPct) / 100);
  const portes = parseFloat(portesAmount) || 0;
  const total = afterHeaderDiscount + recargoAmount + portes + totalIva;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
      <h3 className="text-sm font-bold" style={{ color: C.cream }}>{editAlbaran ? 'Editar albarán' : 'Nuevo albarán'}</h3>

      <div className="grid grid-cols-2 gap-3">
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}>
          <option value="">Seleccionar proveedor</option>
          {suppliers.filter(s => s.active).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input type="text" value={albaranNumber} onChange={e => setAlbaranNumber(e.target.value)}
          placeholder="Número de albarán"
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
          placeholder="Número de factura (opcional)"
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
      </div>

      <input type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)}
        placeholder="Recibido por"
        className="rounded-lg px-3 py-2 text-xs"
        style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />

      {!editAlbaran && (
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Vincular a pedido de compra (opcional)</label>
          <select value={linkedPurchaseOrderId} onChange={e => setLinkedPurchaseOrderId(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs w-full"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}>
            <option value="">Sin pedido previo</option>
            {purchaseOrders.filter(po => !supplierId || po.supplierId === supplierId).map(po => (
              <option key={po.id} value={po.id}>PO-{po.orderNumber} - {po.supplierName} ({po.status})</option>
            ))}
          </select>
        </div>
      )}
      {editAlbaran && editAlbaran.linkedPurchaseOrderId && (
        <div className="text-[10px]" style={{ color: C.muted }}>
          Vinculado a pedido: {purchaseOrders.find(po => po.id === editAlbaran.linkedPurchaseOrderId)?.orderNumber || 'N/A'}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Descuento cabecera %</label>
          <input type="number" step="0.1" value={headerDiscountPct} min={0} max={100}
            onChange={e => setHeaderDiscountPct(parseFloat(e.target.value) || 0)}
            className="rounded-lg px-2 py-1.5 text-[10px] w-full"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Recargo eq. %</label>
          <input type="number" step="0.1" value={recargoEquivalenciaPct} min={0} max={100}
            onChange={e => setRecargoEquivalenciaPct(parseFloat(e.target.value) || 0)}
            className="rounded-lg px-2 py-1.5 text-[10px] w-full"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: C.muted }}>Portes €</label>
          <input type="number" step="0.01" value={portesAmount} min={0}
            onChange={e => setPortesAmount(parseFloat(e.target.value) || 0)}
            className="rounded-lg px-2 py-1.5 text-[10px] w-full"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
        </div>
      </div>

      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="rounded-lg p-2 space-y-2" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <div className="flex items-center gap-2">
              <select value={l.productId} onChange={e => updateLine(i, 'productId', e.target.value)}
                className="flex-1 rounded-lg px-2 py-1.5 text-[10px]"
                style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
                <option value="">Seleccionar artículo</option>
                {nonElaborados.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={() => removeLine(i)} style={{ color: C.wineLight }}><X className="w-3 h-3" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>Cantidad</label>
                <input type="number" step="0.01" value={l.quantity} min={0}
                  onChange={e => updateLine(i, 'quantity', e.target.value)}
                  className="w-full text-center rounded-lg px-2 py-1 text-[10px]"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
              <div>
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>Pack size</label>
                <input type="number" step="0.01" value={l.packSize} min={0.01}
                  onChange={e => updateLine(i, 'packSize', e.target.value)}
                  className="w-full text-center rounded-lg px-2 py-1 text-[10px]"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
              <div>
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>€/Pack</label>
                <input type="number" step="0.001" value={l.pricePerPack} min={0}
                  onChange={e => updateLine(i, 'pricePerPack', e.target.value)}
                  className="w-full text-center rounded-lg px-2 py-1 text-[10px]"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
              <div>
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>€/Unidad</label>
                <input type="number" step="0.001" value={l.pricePerUnit} min={0} readOnly
                  className="w-full text-center rounded-lg px-2 py-1 text-[10px]"
                  style={{ background: C.surface, color: C.muted, border: `1px solid ${C.line}` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>IVA %</label>
                <select value={l.ivaPct} onChange={e => updateLine(i, 'ivaPct', e.target.value)}
                  className="w-full rounded-lg px-2 py-1 text-[10px]"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
                  <option value="0">0%</option>
                  <option value="4">4%</option>
                  <option value="10">10%</option>
                  <option value="21">21%</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>Desc. línea %</label>
                <input type="number" step="0.1" value={l.lineDiscountPct} min={0} max={100}
                  onChange={e => updateLine(i, 'lineDiscountPct', e.target.value)}
                  className="w-full text-center rounded-lg px-2 py-1 text-[10px]"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
              <div className="text-right">
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>Total</label>
                <span className="font-mono text-[10px]" style={{ color: C.brassLight }}>{calculateLineTotal(l).toFixed(2)}€</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>Nº Lote</label>
                <input type="text" value={l.batchNumber}
                  onChange={e => updateLine(i, 'batchNumber', e.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-lg px-2 py-1 text-[10px]"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
              <div>
                <label className="text-[9px] block mb-0.5" style={{ color: C.muted }}>Caducidad</label>
                <input type="date" value={l.expiryDate}
                  onChange={e => updateLine(i, 'expiryDate', e.target.value)}
                  className="w-full rounded-lg px-2 py-1 text-[10px]"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addLine}
        className="flex items-center gap-1 text-[10px] font-medium hover:opacity-80"
        style={{ color: C.brassLight }}>
        <Plus className="w-3 h-3" /> Añadir línea
      </button>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notas (opcional)"
        className="rounded-lg px-3 py-2 text-xs w-full"
        style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}`, minHeight: '60px' }}
      />

      <div className="space-y-1 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="flex justify-between text-[10px]">
          <span style={{ color: C.muted }}>Base imponible:</span>
          <span className="font-mono" style={{ color: C.cream }}>{totalNet.toFixed(2)}€</span>
        </div>
        {headerDiscountAmount > 0 && (
          <div className="flex justify-between text-[10px]">
            <span style={{ color: C.muted }}>Descuento cabecera:</span>
            <span className="font-mono" style={{ color: C.wine }}>-{headerDiscountAmount.toFixed(2)}€</span>
          </div>
        )}
        <div className="flex justify-between text-[10px]">
          <span style={{ color: C.muted }}>IVA:</span>
          <span className="font-mono" style={{ color: C.cream }}>{totalIva.toFixed(2)}€</span>
        </div>
        {recargoAmount > 0 && (
          <div className="flex justify-between text-[10px]">
            <span style={{ color: C.muted }}>Recargo equivalencia:</span>
            <span className="font-mono" style={{ color: C.cream }}>{recargoAmount.toFixed(2)}€</span>
          </div>
        )}
        {portes > 0 && (
          <div className="flex justify-between text-[10px]">
            <span style={{ color: C.muted }}>Portes:</span>
            <span className="font-mono" style={{ color: C.cream }}>{portes.toFixed(2)}€</span>
          </div>
        )}
        <div className="flex justify-between pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
          <span className="text-sm font-bold" style={{ color: C.cream }}>Total:</span>
          <span className="font-mono text-sm font-bold" style={{ color: C.brassLight }}>{total.toFixed(2)}€</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: C.surface, color: C.muted }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !supplierId || !albaranNumber}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40"
            style={{ background: C.sage + '30', color: C.sage }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Guardar borrador
          </button>
        </div>
      </div>
    </div>
  );
}
