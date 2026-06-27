'use client';

import { useState, useEffect } from 'react';
import { Clock, Search, X, RefreshCw, Undo2, ArrowUpDown, AlertTriangle, ChefHat } from 'lucide-react';

const ACTION_LABELS = {
  undo_ready: 'Deshacer Listo',
  order_bump: 'Bump de pedido',
  order_undo: 'Deshacer bump',
  item_86: 'Marcar agotado (86)',
};
const ACTION_ICONS = {
  undo_ready: Undo2,
  order_bump: ArrowUpDown,
  order_undo: Undo2,
  item_86: AlertTriangle,
};
const ACTION_COLORS = {
  undo_ready: '#c4a04a',
  order_bump: '#7a9a7c',
  order_undo: '#b05e5e',
  item_86: '#b05e5e',
};

const ACTIONS = ['', 'undo_ready', 'order_bump', 'order_undo', 'item_86'];

export default function AuditView({ colors: C }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { loadLogs(); }, [filterAction]);

  async function loadLogs() {
    setLoading(true);
    try {
      const { fetchKDSAudit } = await import('../lib/api');
      const data = await fetchKDSAudit(200, 0, filterAction);
      setLogs(data || []);
    } catch {}
    setLoading(false);
  }

  const filtered = search
    ? logs.filter(l => JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: C.cream }}>Auditoría de cocina</h2>
          <p className="text-xs mt-1" style={{ color: C.muted }}>
            Historial de deshacer, bumps y agotados (86) del KDS
          </p>
        </div>
        <button onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
          style={{ background: C.surfaceLight, color: C.muted }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {ACTIONS.map(a => (
          <button key={a} onClick={() => setFilterAction(a)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{
              background: filterAction === a ? (a ? ACTION_COLORS[a] : C.surfaceLight) : 'transparent',
              color: filterAction === a ? '#fff' : C.muted,
              border: `1px solid ${filterAction === a ? 'transparent' : C.line}`,
            }}>
            {a ? ACTION_LABELS[a] : 'Todas'}
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: C.muted }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en detalle…"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: '2rem' }}
            className="w-full rounded-lg px-3 py-1.5 text-xs" />
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="text-center py-12" style={{ color: C.muted }}>
          <Clock className="w-6 h-6 mx-auto mb-2 animate-spin" />
          <p className="text-xs">Cargando…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: C.muted }}>
          <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay eventos registrados</p>
          <p className="text-xs mt-1">Las acciones del KDS aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(log => {
            const Icon = ACTION_ICONS[log.action] || Clock;
            const label = ACTION_LABELS[log.action] || log.action;
            const color = ACTION_COLORS[log.action] || C.muted;
            const d = log.details || {};
            const time = new Date(log.createdAt).toLocaleString('es-ES', {
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
            return (
              <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: C.surfaceLight, borderLeft: `3px solid ${color}` }}>
                <div className="shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: C.cream }}>{label}</span>
                    <span className="text-[9px]" style={{ color: C.muted }}>{time}</span>
                  </div>
                  <div className="text-[10px] mt-0.5 space-y-0.5" style={{ color: C.muted }}>
                    {d.tableName && <span>Mesa: {d.tableName}</span>}
                    {d.productName && <span> · {d.productName}</span>}
                    {d.itemName && <span> · {d.itemName}</span>}
                    {d.previousState && <span> · Estado anterior: {d.previousState}</span>}
                    {d.agotado !== undefined && <span> · {d.agotado ? 'Agotado' : 'Disponible'}</span>}
                    {d.label && <span> · {d.label}</span>}
                    {d.deviceId && <span> · ID: {d.deviceId.slice(0, 12)}…</span>}
                    {d.note && <span> · {d.note}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
