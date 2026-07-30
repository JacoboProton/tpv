'use client';

import { useState, useEffect, useMemo } from 'react';
import { Package, Settings, Truck, Loader2 } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { CatalogProduct, PurchaseOrder, Supplier } from './types';
import { OrdersTab } from './OrdersTab';
import { AutoTab } from './AutoTab';
import { SuppliersTab } from './SuppliersTab';

interface Props { colors: Theme; }

export default function PedidosCompraView({ colors: C }: Props) {
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
      {tab === 'auto' && <AutoTab C={C} onRefresh={loadAll} />}
      {tab === 'suppliers' && <SuppliersTab suppliers={suppliers} catalog={catalog} nonElaborados={nonElaborados} C={C} onRefresh={loadAll} />}
    </div>
  );
}
