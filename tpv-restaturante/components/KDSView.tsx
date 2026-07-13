'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChefHat, Clock, Check, X, Bell, BellOff, Maximize, Minimize,
  LayoutGrid, Columns, RefreshCw, Printer, Search, AlertTriangle, Layers,
  Undo2, Sun, Moon, Languages,
} from 'lucide-react';
import type { Theme } from './constants';

interface KDSThemeColors {
  base: string; surface: string; surfaceLight: string; line: string;
  accent: string; accentLight: string; cream: string; muted: string;
  danger: string; success: string; successLight: string;
}

const KDS_THEMES: Record<string, KDSThemeColors> = {
  dark: { base: '#1a1d23', surface: '#252830', surfaceLight: '#30343e', line: '#3e4350', accent: '#c4a04a', accentLight: '#d6b86a', cream: '#e6e1d6', muted: '#9c958a', danger: '#b05e5e', success: '#7a9a7c', successLight: '#94b496' },
  highContrast: { base: '#000000', surface: '#1a1a1a', surfaceLight: '#2a2a2a', line: '#555555', accent: '#ffcc00', accentLight: '#ffdd33', cream: '#ffffff', muted: '#aaaaaa', danger: '#ff4444', success: '#44cc44', successLight: '#66dd66' },
  colorblind: { base: '#1a1d23', surface: '#252830', surfaceLight: '#30343e', line: '#3e4350', accent: '#e6a800', accentLight: '#f0c040', cream: '#e6e1d6', muted: '#9c958a', danger: '#d97373', success: '#6a9a7a', successLight: '#82b08e' },
  light: { base: '#f4efe6', surface: '#ece6da', surfaceLight: '#e2dace', line: '#cec6b8', accent: '#b0963e', accentLight: '#98802e', cream: '#2c2822', muted: '#8a8478', danger: '#b05e5e', success: '#6a8a6c', successLight: '#7a9a7c' },
};

interface KDSLang {
  title: string; pending: string; preparing: string; ready: string;
  expo: string; allZones: string; allStations: string; noOrders: string;
  markReady: string; markPreparing: string; markServed: string; undo: string;
  settings: string; sound: string; fullscreen: string; layout: string;
  compact: string; columns: string; language: string; theme: string;
  stockControl: string; searchProduct: string;
  agotado: string; disponible: string; reprint: string;
  newOrder: string; minAgo: string; expoEmpty: string;
  reconnect: string; connecting: string; disconnected: string;
  stations: string; refresh: string;
  orders: string;
}

const KDS_LANGS: Record<string, KDSLang> = {
  es: {
    title: 'COCINA', pending: 'Pendientes', preparing: 'Preparando', ready: 'Listos',
    expo: 'Expo', allZones: 'Todos', allStations: 'Todas', noOrders: 'No hay comandas pendientes',
    markReady: 'Listo', markPreparing: 'Empezar', markServed: 'Servido', undo: 'Deshacer',
    settings: 'Ajustes', sound: 'Sonido', fullscreen: 'Pantalla completa', layout: 'Diseño',
    compact: 'Compacto', columns: 'Columnas', language: 'Idioma', theme: 'Tema',
    stockControl: 'Control de stock', searchProduct: 'Buscar producto…',
    agotado: 'Agotado', disponible: 'Disponible', reprint: 'Reimprimir comanda',
    newOrder: 'Nueva comanda', minAgo: 'min', expoEmpty: 'Todo servido',
    reconnect: 'Reconectar', connecting: 'Conectando…', disconnected: 'Sin conexión',
    stations: 'Estaciones', refresh: 'Actualizar',
    orders: 'Comandas',
  },
  en: {
    title: 'KITCHEN', pending: 'Pending', preparing: 'Preparing', ready: 'Ready',
    expo: 'Expo', allZones: 'All', allStations: 'All', noOrders: 'No pending orders',
    markReady: 'Ready', markPreparing: 'Start', markServed: 'Served', undo: 'Undo',
    settings: 'Settings', sound: 'Sound', fullscreen: 'Fullscreen', layout: 'Layout',
    compact: 'Compact', columns: 'Columns', language: 'Language', theme: 'Theme',
    stockControl: 'Stock control', searchProduct: 'Search product…',
    agotado: '86', disponible: 'Available', reprint: 'Reprint ticket',
    newOrder: 'New order', minAgo: 'min', expoEmpty: 'All served',
    reconnect: 'Reconnect', connecting: 'Connecting…', disconnected: 'Disconnected',
    stations: 'Stations', refresh: 'Refresh',
    orders: 'Orders',
  },
};

const ITEM_STATES = ['pending', 'preparing', 'ready'] as const;
const STATE_COLORS: Record<string, string> = { pending: '#b05e5e', preparing: '#c4a04a', ready: '#7a9a7c' };
const STATE_LABELS: Record<string, string> = { pending: 'Nuevo', preparing: 'Preparando', ready: 'Listo' };

interface KDSItem {
  id: string;
  productId: string;
  name: string;
  qty: number;
  price: number;
  sent: boolean;
  sentAt?: number;
  inPreparation?: boolean;
  ready?: boolean;
  served?: boolean;
  notes?: string;
  course?: string;
  ubicacion?: string;
  modifiers?: string[] | { name?: string }[];
}

interface KDSOrder {
  tableId?: string;
  items: KDSItem[];
  [key: string]: unknown;
}

interface KDSTable {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface KDSFloor {
  orders?: Record<string, KDSOrder>;
  tables?: KDSTable[];
  [key: string]: unknown;
}

interface KDSCategory {
  name: string;
  printer_zone?: string;
}

interface KDSProduct {
  id: string;
  name: string;
  price: number;
  category?: string;
  agotado?: boolean;
}

interface KDSCatalog {
  products?: KDSProduct[];
  categories?: (KDSCategory | string)[];
}

interface FilteredOrder {
  orderId: string;
  tableName: string;
  items: KDSItem[];
  [key: string]: unknown;
}

interface KDSViewProps {
  floor: KDSFloor | null;
  catalog: KDSCatalog | null;
  onReady?: (id: string) => void;
  onAgotar?: (productId: string, agotado: boolean) => void;
  onUpdateItemState: (next: KDSFloor, action: { orderId: string; itemId: string | null; previousState: string | null }) => void;
  onAdvanceOrder: (next: KDSFloor, action: { orderId: string; itemId: string | null; previousState: string | null } | null) => void;
  onReprint?: (orderId: string) => void;
  colors: Theme;
}

export default function KDSView({ floor, catalog, onReady, onAgotar, onUpdateItemState, onAdvanceOrder, onReprint }: KDSViewProps) {
  const [zoneFilter, setZoneFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'orders' | 'expo'>('orders');
  const [layout, setLayout] = useState<'compact' | 'columns'>('compact');
  const [fullscreen, setFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lang, setLang] = useState('es');
  const [kdsTheme, setKdsTheme] = useState('dark');
  const [showSettings, setShowSettings] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [searchStock, setSearchStock] = useState('');
  const [undoStack, setUndoStack] = useState<{ orderId: string; itemId: string | null; previousState: string | null } | null>(null);
  const [connected, setConnected] = useState(true);
  const [now, setNow] = useState(Date.now());
  const prevPendingRef = useRef(0);
  const K = KDS_LANGS[lang];
  const KTC: KDSThemeColors = KDS_THEMES[kdsTheme];

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!floor) return;
    const pending = Object.values(floor.orders || {}).reduce((sum, o) =>
      sum + o.items.filter(i => i.sent && !i.inPreparation && !i.ready && i.ubicacion !== 'Bar').length, 0
    );
    if (pending > prevPendingRef.current && prevPendingRef.current > 0 && soundEnabled) {
      playAlert();
    }
    prevPendingRef.current = pending;
  }, [floor, soundEnabled]);

  useEffect(() => {
    if (undoStack) {
      const t = setTimeout(() => setUndoStack(null), 5000);
      return () => clearTimeout(t);
    }
  }, [undoStack]);

  function playAlert() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'square'; osc.frequency.value = 880;
      const g = ctx.createGain(); g.gain.value = 0.15;
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); setFullscreen(true); }
    else { document.exitFullscreen().catch(() => {}); setFullscreen(false); }
  }

  function handleItemState(orderId: string, itemId: string) {
    const action: { orderId: string; itemId: string; previousState: string | null } = { orderId, itemId, previousState: null };
    const next = JSON.parse(JSON.stringify(floor)) as KDSFloor;
    const order = next.orders?.[orderId];
    if (!order) return;
    const item = order.items.find(i => i.id === itemId);
    if (!item) return;
    action.previousState = item.inPreparation ? 'preparing' : item.ready ? 'ready' : 'pending';
    if (!item.inPreparation && !item.ready) { item.inPreparation = true; }
    else if (item.inPreparation && !item.ready) { item.inPreparation = false; item.ready = true; }
    else if (item.ready) { item.ready = false; item.served = true; }
    onUpdateItemState(next, action);
    setUndoStack(action);
  }

  function handleAdvanceOrder(orderId: string) {
    const action: { orderId: string; itemId: null; previousState: string | null } = { orderId, itemId: null, previousState: null };
    const next = JSON.parse(JSON.stringify(floor)) as KDSFloor;
    const order = next.orders?.[orderId];
    if (!order) return;
    const target = order.items.filter(i => i.sent && !i.served && i.ubicacion !== 'Bar');
    const allReady = target.every(i => i.ready);
    const allPreparing = target.every(i => i.inPreparation || i.ready);
    action.previousState = allReady ? 'ready' : allPreparing ? 'preparing' : 'pending';
    target.forEach(i => {
      if (allReady) { i.served = true; }
      else if (allPreparing) { i.inPreparation = false; i.ready = true; }
      else { i.inPreparation = true; }
    });
    onAdvanceOrder(next, action);
    setUndoStack(action);
  }

  function handleUndo() {
    if (!undoStack) return;
    const next = JSON.parse(JSON.stringify(floor)) as KDSFloor;
    const order = next.orders?.[undoStack.orderId];
    if (!order) return;
    if (undoStack.itemId) {
      const item = order.items.find(i => i.id === undoStack.itemId);
      if (!item) return;
      item.inPreparation = undoStack.previousState === 'preparing';
      item.ready = undoStack.previousState === 'ready';
      item.served = false;
    } else {
      order.items.filter(i => i.sent && !i.served && i.ubicacion !== 'Bar').forEach(i => {
        if (undoStack.previousState === 'ready') { i.ready = true; i.inPreparation = false; i.served = false; }
        else if (undoStack.previousState === 'preparing') { i.inPreparation = true; i.ready = false; i.served = false; }
        else { i.inPreparation = false; i.ready = false; i.served = false; }
      });
    }
    onAdvanceOrder(next, null);
    setUndoStack(null);
  }

  const zones: string[] = useMemo(() => {
    const z = new Set<string>();
    if (catalog?.categories) catalog.categories.forEach(c => { const cat = typeof c === 'string' ? null : c; if (cat?.printer_zone) z.add(cat.printer_zone); });
    return ['all', ...z];
  }, [catalog]);

  const stations = ['all', 'Plancha', 'Freidora', 'Horno', 'Frío', 'Montaje'];

  const filteredOrders: FilteredOrder[] = useMemo(() => {
    if (!floor?.orders) return [];
    return Object.entries(floor.orders).map(([id, o]) => {
      const table = floor.tables?.find(t => t.id === o.tableId);
      const items = o.items.filter(i => i.sent && !i.served && i.ubicacion !== 'Bar');
      const zoneItems = zoneFilter === 'all' ? items : items.filter(i => {
        if (!catalog?.products) return false;
        const p = catalog.products.find(p => p.id === i.productId);
        if (!p) return false;
        const cat = catalog.categories?.find(c => (typeof c === 'string' ? c : c.name) === (typeof p.category === 'string' ? p.category : ''));
        return typeof cat !== 'string' && cat?.printer_zone === zoneFilter;
      });
      if (zoneItems.length === 0) return null;
      return { ...o, orderId: id, tableName: table?.name || o.tableId || id, items: zoneItems };
    }).filter(Boolean) as FilteredOrder[];
  }, [floor, zoneFilter, catalog]);

  interface ExpoItem extends KDSItem {
    orderId: string;
    tableName: string;
    tableId?: string;
  }

  const expoItems: ExpoItem[] = useMemo(() => {
    return Object.entries(floor?.orders || {}).flatMap(([oid, o]) => {
      const table = floor?.tables?.find(t => t.id === o.tableId);
      return o.items.filter(i => i.ready && !i.served && i.ubicacion !== 'Bar').map(i => ({ ...i, orderId: oid, tableName: table?.name || o.tableId || oid, tableId: o.tableId }));
    });
  }, [floor]);

  const counts = useMemo(() => {
    const all = Object.values(floor?.orders || {}).reduce((acc, o) => {
      o.items.filter(i => i.sent && !i.served && i.ubicacion !== 'Bar').forEach(i => {
        if (i.ready) acc.ready++;
        else if (i.inPreparation) acc.preparing++;
        else acc.pending++;
      });
      return acc;
    }, { pending: 0, preparing: 0, ready: 0 });
    return all;
  }, [floor]);

  const agotados = useMemo(() => {
    if (!catalog?.products) return [];
    return catalog.products.filter(p => p.agotado);
  }, [catalog]);

  return (
    <div style={{ background: KTC.base, color: KTC.cream, minHeight: '100vh' }} className="flex flex-col">
      {/* Header bar */}
      <header style={{ background: KTC.surface, borderBottom: `1px solid ${KTC.line}` }} className="sticky top-0 z-20">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg" style={{ color: KTC.accent }}>{K.title}</h1>
            <div className="flex items-center gap-4 text-xs" style={{ color: KTC.muted }}>
              <span style={{ color: STATE_COLORS.pending }}>● {K.pending} <strong>{counts.pending}</strong></span>
              <span style={{ color: STATE_COLORS.preparing }}>● {K.preparing} <strong>{counts.preparing}</strong></span>
              <span style={{ color: STATE_COLORS.ready }}>● {K.ready} <strong>{counts.ready}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Zone tabs */}
            <div className="flex items-center gap-0.5 mr-3">
              {zones.map(z => (
                <button key={z} onClick={() => { setZoneFilter(z); setStationFilter('all'); }}
                  style={{
                    background: zoneFilter === z ? KTC.accent : 'transparent',
                    color: zoneFilter === z ? KTC.base : KTC.muted,
                    border: `1px solid ${zoneFilter === z ? KTC.accent : KTC.line}`,
                  }}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-md hover:opacity-80 whitespace-nowrap">
                  {z === 'all' ? K.allZones : z}
                </button>
              ))}
            </div>
            {/* Station filter */}
            {zoneFilter !== 'all' && (
              <div className="flex items-center gap-0.5 mr-3">
                {stations.map(s => (
                  <button key={s} onClick={() => setStationFilter(s)}
                    style={{
                      background: stationFilter === s ? KTC.surfaceLight : 'transparent',
                      color: stationFilter === s ? KTC.accentLight : KTC.muted,
                      border: `1px solid ${stationFilter === s ? KTC.accent : 'transparent'}`,
                    }}
                    className="px-2 py-0.5 text-[9px] rounded hover:opacity-80 whitespace-nowrap">
                    {s === 'all' ? K.allStations : s}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setViewMode(viewMode === 'orders' ? 'expo' : 'orders')}
              style={{ background: viewMode === 'expo' ? KTC.success : KTC.surfaceLight, color: viewMode === 'expo' ? KTC.base : KTC.cream }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80">
              {viewMode === 'expo' ? K.orders : K.expo}
              {counts.ready > 0 && <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: KTC.danger, color: '#fff' }}>{counts.ready}</span>}
            </button>
            <div className="w-px h-5 mx-1" style={{ background: KTC.line }} />
            <button onClick={() => setLayout(layout === 'compact' ? 'columns' : 'compact')} className="p-1.5 rounded hover:opacity-70" style={{ color: KTC.muted }} title={K.layout}>
              {layout === 'compact' ? <Columns className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-1.5 rounded hover:opacity-70" style={{ color: soundEnabled ? KTC.success : KTC.muted }} title={K.sound}>
              {soundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={toggleFullscreen} className="p-1.5 rounded hover:opacity-70" style={{ color: KTC.muted }} title={K.fullscreen}>
              {fullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setShowStock(true)} className="p-1.5 rounded hover:opacity-70 relative" style={{ color: KTC.muted }} title={K.stockControl}>
              <AlertTriangle className="w-3.5 h-3.5" />
              {agotados.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: KTC.danger, color: '#fff' }}>{agotados.length}</span>}
            </button>
            <button onClick={() => setShowSettings(true)} className="p-1.5 rounded hover:opacity-70" style={{ color: KTC.muted }}>
              <ChefHat className="w-3.5 h-3.5" />
            </button>
            {!connected && (
              <button onClick={() => setConnected(true)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium" style={{ background: KTC.danger, color: '#fff' }}>
                {K.reconnect}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Expo view */}
      {viewMode === 'expo' ? renderExpo() : renderOrders()}

      {/* Undo bar */}
      {undoStack && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium animate-fade-in"
          style={{ background: KTC.surfaceLight, border: `1px solid ${KTC.accent}`, color: KTC.cream }}>
          <Undo2 className="w-4 h-4" style={{ color: KTC.accent }} />
          <button onClick={handleUndo} className="hover:opacity-80" style={{ color: KTC.accentLight }}>{K.undo}</button>
          <span className="text-[10px]" style={{ color: KTC.muted }}>5s</span>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-5 w-full max-w-sm space-y-4" style={{ background: KTC.surface, border: `1px solid ${KTC.line}` }}>
            <h2 className="font-bold text-lg" style={{ color: KTC.cream }}>{K.settings}</h2>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: KTC.cream }}>{K.language}</label>
              <div className="flex gap-2">
                {['es', 'en'].map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium hover:opacity-80"
                    style={{ background: lang === l ? KTC.accent : KTC.surfaceLight, color: lang === l ? KTC.base : KTC.cream }}>
                    <Languages className="w-3.5 h-3.5 inline mr-1" />{l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: KTC.cream }}>{K.theme}</label>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(KDS_THEMES).map(t => (
                  <button key={t} onClick={() => setKdsTheme(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                    style={{ background: kdsTheme === t ? KTC.accent : KTC.surfaceLight, color: kdsTheme === t ? KTC.base : KTC.cream }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: KTC.cream }}>{K.sound}</span>
              <button onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded" style={{ color: soundEnabled ? KTC.success : KTC.muted }}>
                {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => setShowSettings(false)}
              className="w-full py-2 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ background: KTC.accent, color: KTC.base }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Stock control modal */}
      {showStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-5 w-full max-w-md space-y-4" style={{ background: KTC.surface, border: `1px solid ${KTC.line}` }}>
            <h2 className="font-bold text-lg" style={{ color: KTC.cream }}>{K.stockControl} (86)</h2>
            <div className="relative">
              <input type="text" value={searchStock} onChange={e => setSearchStock(e.target.value)}
                placeholder={K.searchProduct}
                style={{ background: KTC.surfaceLight, color: KTC.cream, border: `1px solid ${KTC.line}`, paddingLeft: '2.5rem' }}
                className="w-full rounded-lg px-3 py-2 text-sm" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: KTC.muted }} />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {(catalog?.products || []).filter(p => !searchStock || p.name.toLowerCase().includes(searchStock.toLowerCase())).map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: KTC.surfaceLight }}>
                  <span className="text-sm" style={{ color: KTC.cream }}>{p.name}</span>
                  <button onClick={() => onAgotar?.(p.id, !p.agotado)}
                    className="px-3 py-1 rounded-lg text-[10px] font-medium hover:opacity-80"
                    style={{ background: p.agotado ? KTC.danger : KTC.success, color: '#fff' }}>
                    {p.agotado ? K.agotado : K.disponible}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowStock(false)}
              className="w-full py-2 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ background: KTC.surfaceLight, color: KTC.cream }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ----- Orders view -----
  function renderOrders() {
    if (filteredOrders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <ChefHat className="w-12 h-12 mb-3" style={{ color: KTC.muted, opacity: 0.4 }} />
          <p style={{ color: KTC.muted }} className="text-sm">{K.noOrders}</p>
        </div>
      );
    }

    return (
      <div className={`flex-1 p-3 overflow-y-auto ${layout === 'compact' ? 'space-y-1' : ''}`}>
        <div className={layout === 'compact' ? 'space-y-1' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'}>
          {filteredOrders.map(order => (
            <OrderCard key={order.orderId} order={order} now={now} layout={layout} K={K} KTC={KTC}
              onItemClick={(itemId: string) => handleItemState(order.orderId, itemId)}
              onReprint={() => onReprint?.(order.orderId)} />
          ))}
        </div>
      </div>
    );
  }

  // ----- Expo view -----
  function renderExpo() {
    if (expoItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <Check className="w-12 h-12 mb-3" style={{ color: KTC.success, opacity: 0.6 }} />
          <p style={{ color: KTC.muted }} className="text-sm">{K.expoEmpty}</p>
        </div>
      );
    }

    const byTable: Record<string, { tableName: string; orderId: string; items: ExpoItem[]; since: number }> = {};
    for (const item of expoItems) {
      const key = `${item.tableId}-${item.orderId}`;
      if (!byTable[key]) byTable[key] = { tableName: item.tableName, orderId: item.orderId, items: [], since: Date.now() };
      byTable[key].items.push(item);
    }

    return (
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Object.values(byTable).map(group => {
            const waiting = Math.round((now - group.since) / 60000);
            const flash = waiting >= 3;
            return (
              <div key={`${group.orderId}`} className={`rounded-xl overflow-hidden ${flash ? 'animate-pulse' : ''}`}
                style={{ border: `2px solid ${flash ? KTC.danger : KTC.success}`, background: KTC.surface }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: flash ? KTC.danger : KTC.success }}>
                  <span className="font-bold text-lg" style={{ color: '#fff' }}>{group.tableName}</span>
                  <span className="text-xs" style={{ color: flash ? '#ffcaca' : '#e6ffd6' }}>
                    <Clock className="w-3 h-3 inline mr-1" />{waiting}{K.minAgo}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {group.items.map(item => (
                    <button key={item.id} onClick={() => handleItemState(item.orderId, item.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg font-medium text-sm hover:opacity-80 transition-opacity"
                      style={{ background: KTC.surfaceLight, color: KTC.cream }}>
                      {item.qty}× {item.name}
                    </button>
                  ))}

                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

// ----- Order Card -----
interface OrderCardProps {
  order: FilteredOrder;
  now: number;
  layout: string;
  K: KDSLang;
  KTC: KDSThemeColors;
  onItemClick: (itemId: string) => void;
  onReprint: () => void;
}

function OrderCard({ order, now, layout, K, KTC, onItemClick, onReprint }: OrderCardProps) {
  const items = order.items;
  const sentAts = items.map(i => i.sentAt || now);
  const minutesAgo = Math.max(0, Math.round((now - Math.min(...sentAts)) / 60000));
  const urgent = minutesAgo >= 10;
  const pendingCount = items.filter(i => !i.inPreparation && !i.ready).length;
  const preparingCount = items.filter(i => i.inPreparation && !i.ready).length;
  const readyCount = items.filter(i => i.ready).length;

  const courseOrder = ['Entrantes', 'Principales', 'Postres', ''];
  const groups: Record<string, KDSItem[]> = {};
  for (const item of items) {
    const key = item.course || 'General';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  const sortedGroups = courseOrder.filter(c => groups[c || 'General']).concat(
    Object.keys(groups).filter(k => !courseOrder.includes(k === 'General' ? '' : k))
  );

  function renderItem(item: KDSItem) {
    const state = item.ready ? 'ready' : item.inPreparation ? 'preparing' : 'pending';
    return (
      <button key={item.id} onClick={() => onItemClick(item.id)}
        className={`w-full text-left transition-colors hover:opacity-80 ${layout === 'compact' ? 'flex items-center gap-2 px-3 py-1.5' : 'px-3 py-2 rounded-lg'}`}
        style={{ background: layout === 'compact' ? 'transparent' : KTC.surfaceLight }}>
        {layout === 'compact' ? (
          <>
            <span className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: STATE_COLORS[state], color: '#fff' }}>{item.qty}</span>
            <span className="text-sm flex-1 truncate" style={{ color: KTC.cream }}>{item.name}</span>
            {item.notes && <span className="text-[9px] px-1 py-0.5 rounded shrink-0" style={{ background: KTC.accent + '30', color: KTC.accentLight }}>{item.notes}</span>}
            {item.modifiers && item.modifiers.length > 0 && <span className="text-[9px]" style={{ color: KTC.muted }}>+{item.modifiers.length}</span>}
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATE_COLORS[state] }} />
          </>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm" style={{ color: KTC.cream }}>{item.qty}× {item.name}</span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATE_COLORS[state] }} />
              </div>
              {item.notes && <p className="text-[10px] mt-0.5" style={{ color: KTC.accentLight }}>{item.notes}</p>}
              {item.modifiers && item.modifiers.length > 0 && <p className="text-[9px] mt-0.5" style={{ color: KTC.muted }}>{item.modifiers.map(m => typeof m === 'string' ? m : (m as { name?: string }).name || '').filter(Boolean).join(', ')}</p>}
            </div>
            <span className="text-[9px] font-medium shrink-0 ml-2" style={{ color: STATE_COLORS[state] }}>{STATE_LABELS[state]}</span>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden transition-all duration-300 ${urgent ? 'ring-2' : ''}`}
      style={{
        background: KTC.surface,
        border: `1px solid ${urgent ? KTC.danger : KTC.line}`,
        boxShadow: urgent ? `0 0 24px ${KTC.danger}40` : 'none',
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: urgent ? KTC.danger : KTC.surfaceLight }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base" style={{ color: urgent ? '#fff' : KTC.cream }}>{order.tableName}</span>
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: urgent ? '#ffcaca' : KTC.muted }}>
            <Clock className="w-3 h-3" /> {minutesAgo}{K.minAgo}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {pendingCount > 0 && <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: STATE_COLORS.pending, color: '#fff' }}>{pendingCount}</span>}
          {preparingCount > 0 && <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: STATE_COLORS.preparing, color: '#fff' }}>{preparingCount}</span>}
          {readyCount > 0 && <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: STATE_COLORS.ready, color: '#fff' }}>{readyCount}</span>}
          <button onClick={onReprint} className="p-1 rounded hover:opacity-70" style={{ color: KTC.muted }}><Printer className="w-3 h-3" /></button>
        </div>
      </div>
      {/* Items grouped by course */}
      <div className={layout === 'compact' ? 'divide-y' : 'p-3 space-y-3'} style={{ borderColor: KTC.line }}>
          {sortedGroups.map(courseKey => {
          const courseItems = groups[courseKey];
          if (!courseItems?.length) return null;
          const headerColors: Record<string, string> = { Entrantes: '#7a9a7c', Principales: '#c4a04a', Postres: '#b05e5e' };
          const isNamed = courseKey !== 'General';
          const allReady = courseItems.every(i => i.ready);
          return (
            <div key={courseKey}>
              {isNamed && (
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: headerColors[courseKey] || KTC.muted }}>
                    {courseKey}
                  </span>
                  {allReady && <span className="text-[9px] font-bold" style={{ color: KTC.success }}>✅ Listo</span>}
                </div>
              )}
              <div className={layout === 'compact' ? '' : 'space-y-1.5'}>
                {courseItems.map(renderItem)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
