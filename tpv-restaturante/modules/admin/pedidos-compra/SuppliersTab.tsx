'use client';

import { useState, useEffect } from 'react';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { Supplier, SupplierCatalogOffer, CatalogProduct } from './types';

export function SuppliersTab({ suppliers, catalog, nonElaborados, C, onRefresh }: {
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
