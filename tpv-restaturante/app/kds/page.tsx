'use client';

import { useState, useEffect } from 'react';
import { Monitor, Clock } from 'lucide-react';
import KDSView from '../../modules/kitchen/KDSView';
import AppProviders, { type ViewData, type ViewHandlers } from '../../modules/core/app-contexts';
import { connectRealtime, broadcastFloorUpdate, broadcastReadyNotification, disconnectRealtime, applyFloorDiff } from '../../lib/realtime';
import type { Theme } from '@/components/constants';
import type { Floor, Catalog } from '@tpv/core';

const KTC: Record<string, string> = { base: '#1a1d23', surface: '#252830', surfaceLight: '#30343e', accent: '#c4a04a', cream: '#e6e1d6', muted: '#9c958a' };

export default function KDSPage() {
  const [paired, setPaired] = useState<boolean | null>(null);
  const [floor, setFloor] = useState<Record<string, unknown> | null>(null);
  const [catalog, setCatalog] = useState<Record<string, unknown> | null>(null);
  const tenantId: string = typeof window !== 'undefined' ? (localStorage.getItem('kds_tenant_id') || 'default') : 'default';

  useEffect(() => {
    const ch = connectRealtime(tenantId);
    if (ch) {
      ch.on('broadcast', { event: 'floor:updated' }, ({ payload }: { payload: any }) => {
        setFloor((prev: any) => applyFloorDiff(prev, payload));
      });
    }
    return () => { disconnectRealtime(); };
  }, []);

  useEffect(() => {
    const deviceId = localStorage.getItem('kds_device_id');
    if (!deviceId) { setPaired(false); return; }
    fetch(`/api/kds?deviceId=${encodeURIComponent(deviceId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.paired) { setPaired(true); loadData(); }
        else { setPaired(false); }
      })
      .catch(() => setPaired(false));
  }, []);

  function kdsHeaders(): Record<string, string> {
    const key = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY ? process.env.NEXT_PUBLIC_TPV_API_KEY : '';
    const h: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': tenantId };
    if (key) h['x-tpv-key'] = key;
    return h;
  }

  async function loadData() {
    try {
      const [flr, cat] = await Promise.all([
        fetch('/api/floor', { headers: kdsHeaders() }).then(r => r.json() as Promise<Record<string, unknown>>),
        fetch('/api/catalog', { headers: kdsHeaders() }).then(r => r.json() as Promise<Record<string, unknown>>),
      ]);
      setFloor(flr);
      setCatalog(cat);
    } catch {}
  }

  if (paired === null) {
    return (
      <div style={{ background: KTC.base, color: KTC.cream, minHeight: '100vh' }}
        className="flex items-center justify-center">
        <Clock className="w-6 h-6 animate-spin mr-2" style={{ color: KTC.muted }} />
        <span style={{ color: KTC.muted }}>Verificando…</span>
      </div>
    );
  }

  if (paired === false) {
    return (
      <div style={{ background: KTC.base, color: KTC.cream, minHeight: '100vh' }}
        className="flex flex-col items-center justify-center p-6">
        <Monitor className="w-12 h-12 mb-3" style={{ color: KTC.accent, opacity: 0.6 }} />
        <h2 className="text-lg font-bold mb-2">Pantalla no emparejada</h2>
        <p className="text-sm mb-4" style={{ color: KTC.muted }}>
          Abre esta URL en un navegador para emparejarla
        </p>
        <a href="/kds/pair"
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: KTC.accent, color: '#000' }}>
          Ir a emparejar
        </a>
      </div>
    );
  }

  if (!floor || !catalog) {
    return (
      <div style={{ background: KTC.base, color: KTC.cream, minHeight: '100vh' }}
        className="flex items-center justify-center">
        <Clock className="w-6 h-6 animate-spin mr-2" style={{ color: KTC.muted }} />
        <span style={{ color: KTC.muted }}>Cargando datos…</span>
      </div>
    );
  }

  const data: ViewData = {
    floor: floor as unknown as Floor,
    catalog: catalog as unknown as Catalog,
    sales: [],
    employees: [],
    offers: [],
    combos: [],
    colors: KTC as unknown as Theme,
    ticketSettings: {},
    currentUser: null,
    showToast: () => {},
    almacenUbicacion: null,
    showFloorEditor: false,
    persistFloor: async (next: Floor) => { void persist(next as unknown as Record<string, unknown>); },
    newProductOpen: false,
    setNewProductOpen: () => {},
    confirmDeleteId: null,
    setConfirmDeleteId: () => {},
  };

  const handlers: ViewHandlers = {
    setSelectedTableId: () => {},
    setActiveCategory: () => {},
    setShowFloorEditor: () => {},
    setAlmacenUbicacion: () => {},
    setView: () => {},
    markReady: () => {},
    updateItemState: (next: Floor, action: { orderId: string; itemId: string | null; previousState: string | null }) => {
      const n = next as unknown as Record<string, unknown>;
      setFloor(n);
      if (action?.previousState === 'preparing') {
        const order = (n.orders as Record<string, unknown>)[action.orderId] as Record<string, unknown> | undefined;
        const item = (order?.items as Array<Record<string, unknown>>)?.find(i => i.id === action.itemId);
        const table = (n.tables as Array<Record<string, unknown>>)?.find(t => t.id === order?.tableId);
        if (item) broadcastReadyNotification((table?.name as string) || (order?.tableId as string), [item.name as string], order?.employeeName as string, tenantId);
      }
      void persist(n);
    },
    advanceOrder: (next: Floor) => {
      const n = next as unknown as Record<string, unknown>;
      setFloor(n);
      void persist(n);
    },
    agotarProducto: async (productId: string, agotado: boolean) => {
      const next = { ...catalog, products: (catalog.products as Array<Record<string, unknown>>).map(p => p.id === productId ? { ...p, agotado } : p) };
      setCatalog(next as unknown as Record<string, unknown>);
      try { await fetch('/api/catalog', { method: 'PUT', headers: kdsHeaders(), body: JSON.stringify(next) }); } catch {}
    },
    reprintKitchenTicket: () => {},
    updateProductField: () => {},
    addProduct: () => {},
    deleteProduct: () => {},
    saveCartas: async () => {},
    saveOffersFn: async () => {},
    saveCombosFn: async () => {},
    saveMealMenusFn: async () => {},
    saveCarrusel: async () => {},
    savePriceRulesFn: async () => {},
    handleRefund: () => {},
    handleConfirmBizum: () => {},
    printInvoice: async () => {},
    handleDownloadPdf: async () => {},
    handleSendInvoiceEmail: async () => {},
    addEmployee: () => {},
    updateEmployeeField: () => {},
    deleteEmployee: () => {},
  };

  return (
    <AppProviders data={data} handlers={handlers} view="kds">
      <KDSView />
    </AppProviders>
  );

  async function persist(flr: Record<string, unknown>) {
    try {
      const h: Record<string, string> = kdsHeaders();
      await fetch('/api/floor', { method: 'PUT', headers: h, body: JSON.stringify(flr) });
      broadcastFloorUpdate(flr, tenantId);
    } catch {}
  }
}
