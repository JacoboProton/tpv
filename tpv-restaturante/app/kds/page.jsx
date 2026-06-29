'use client';

import { useState, useEffect } from 'react';
import { Monitor, Clock } from 'lucide-react';
import KDSView from '../../components/KDSView';
import { connectSocket, emitFloorUpdate } from '../../lib/socket';

const KTC = { base: '#1a1d23', surface: '#252830', surfaceLight: '#30343e', accent: '#c4a04a', cream: '#e6e1d6', muted: '#9c958a' };

export default function KDSPage() {
  const [paired, setPaired] = useState(null);
  const [floor, setFloor] = useState(null);
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    const s = connectSocket();
    s?.on('floor:updated', (data) => {
      setFloor(data);
    });
    return () => { s?.off('floor:updated'); };
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

  async function loadData() {
    try {
      const [flr, cat] = await Promise.all([
        fetch('/api/floor').then(r => r.json()),
        fetch('/api/catalog').then(r => r.json()),
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

  // Build a minimal floor/catalog shape if null (shouldn't happen but handle gracefully)
  if (!floor || !catalog) {
    return (
      <div style={{ background: KTC.base, color: KTC.cream, minHeight: '100vh' }}
        className="flex items-center justify-center">
        <Clock className="w-6 h-6 animate-spin mr-2" style={{ color: KTC.muted }} />
        <span style={{ color: KTC.muted }}>Cargando datos…</span>
      </div>
    );
  }

  return <KDSView floor={floor} catalog={catalog} colors={KTC}
    onUpdateItemState={(next) => { setFloor(next); persist(next); }}
    onAdvanceOrder={(next) => { setFloor(next); persist(next); }}
    onAgotar={async (productId, agotado) => {
      const next = { ...catalog, products: catalog.products.map(p => p.id === productId ? { ...p, agotado } : p) };
      setCatalog(next);
      try { await fetch('/api/catalog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }); } catch {}
    }}
    onReprint={() => {}}
  />;

  async function persist(flr) {
    try {
      await fetch('/api/floor', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flr) });
      emitFloorUpdate(flr);
    } catch {}
  }
}
