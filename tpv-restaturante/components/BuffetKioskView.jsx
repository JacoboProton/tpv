'use client'

import { useState, useEffect, useCallback } from 'react';
import { Clock, Users, Pause, Play, X, Check, ChevronDown, ChevronUp, AlertTriangle, Trash2, Settings, Plus, Minus, Ban, ClipboardList } from 'lucide-react';
import { euros } from './constants';
import { fetchBuffetSessions, fetchBuffetConfig, buffetAction, fetchBuffetRounds } from '../lib/api';

const COLOURS = {
  surface: '#1a1e24',
  surfaceLight: '#252b33',
  base: '#0d0f12',
  cream: '#e8dcc8',
  muted: '#6b7280',
  brass: '#b8860b',
  brassLight: '#d4a843',
  sage: '#6f9272',
  sageLight: '#8fbc8f',
  wine: '#722f37',
  wineLight: '#a0404f',
  line: '#2a2f38',
};

const C = COLOURS;

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimeFull(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h > 0 ? h + 'h ' : ''}${m}' ${s}"`;
}

export default function BuffetKioskView({ floor, currentUser, onToast }) {
  const [sessions, setSessions] = useState([]);
  const [config, setConfig] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [sessionRounds, setSessionRounds] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchBuffetSessions();
      if (data) {
        setSessions(data.sessions || []);
        setConfig(data.config);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);

  const getCfg = (s, key) => {
    if (key === 'time_limit') return s.override_time_limit > 0 ? s.override_time_limit : (config?.time_limit || 90);
    if (key === 'cooldown') return s.override_cooldown > 0 ? s.override_cooldown : (config?.cooldown || 5);
    if (key === 'round_cap') return s.override_round_cap > 0 ? s.override_round_cap : (config?.round_cap || 3);
    return 0;
  };

  const isPaused = config?.paused_until > Date.now();
  const pauseRemaining = config?.paused_until ? Math.max(0, config.paused_until - Date.now()) : 0;

  const handleAction = async (action, payload) => {
    setActionLoading(true);
    try {
      const res = await buffetAction(action, { employeeName: currentUser?.name, ...payload });
      if (res?.error) { onToast?.(res.error); return; }
      await load();
      if (action === 'close' || action === 'void') { setSelectedSession(null); setSessionRounds([]); }
      if (action === 'deliver_round' || action === 'call_customer') {
        if (selectedSession) loadRounds(selectedSession.id);
      }
    } catch { onToast?.('Error en la operación'); }
    setActionLoading(false);
  };

  const loadRounds = async (sessionId) => {
    try {
      const data = await fetchBuffetRounds(sessionId);
      if (data) setSessionRounds(data);
    } catch {}
  };

  const openSessionActions = (s) => {
    setSelectedSession(s);
    loadRounds(s.id);
  };

  const handleBatch = async (batchAction) => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    await handleAction('batch', { batchAction, sessionIds: [...selectedIds] });
    setSelectedIds(new Set());
    setActionLoading(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getTimeColor = (elapsed, limit) => {
    const ratio = elapsed / (limit * 60000);
    if (ratio > 0.95) return C.wineLight;
    if (ratio > 0.75) return C.brassLight;
    return C.sage;
  };

  const freeTables = floor?.tables?.filter(t => t.status === 'libre' && !sessions.some(s => s.table_id === t.id)) || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-display" style={{ color: C.brassLight }}>🔄 Buffet · Kiosk</h2>
          {loading && <span className="text-xs animate-pulse" style={{ color: C.muted }}>cargando...</span>}
        </div>
        <div className="flex items-center gap-2">
          {!batchMode && (
            <>
              {isPaused ? (
                <button onClick={() => handleAction('resume')} disabled={actionLoading}
                  style={{ background: C.sage, color: C.base }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80">
                  <Play className="w-3.5 h-3.5" /> Reanudar
                </button>
              ) : (
                <button onClick={() => handleAction('pause', { minutes: 10 })} disabled={actionLoading}
                  style={{ background: C.wine, color: C.cream }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80">
                  <Pause className="w-3.5 h-3.5" /> Pausar 10'
                </button>
              )}
              <button onClick={() => setBatchMode(true)}
                style={{ color: C.muted, background: C.surfaceLight }}
                className="px-3 py-1.5 rounded-lg text-xs hover:opacity-80">Seleccionar varias</button>
            </>
          )}
          <button onClick={() => setShowConfigModal(true)}
            style={{ color: C.muted, background: C.surfaceLight }}
            className="p-1.5 rounded-lg hover:opacity-80"><Settings className="w-4 h-4" /></button>
        </div>
      </div>

      {/* BATCH MODE toolbar */}
      {batchMode && (
        <div style={{ background: C.surfaceLight }} className="flex items-center gap-2 px-3 py-2 rounded-lg">
          <button onClick={() => { setBatchMode(false); setSelectedIds(new Set()); }}
            style={{ color: C.muted }} className="p-1 hover:opacity-80"><X className="w-4 h-4" /></button>
          <span className="text-xs" style={{ color: C.muted }}>{selectedIds.size} seleccionadas</span>
          <button onClick={() => handleBatch('close_all')} disabled={actionLoading || selectedIds.size === 0}
            style={{ background: C.brass, color: C.base }}
            className="px-2.5 py-1 rounded text-xs font-bold hover:opacity-80">Cerrar todas</button>
          <button onClick={() => handleBatch('reset_cooldown')} disabled={actionLoading || selectedIds.size === 0}
            style={{ background: C.surface, color: C.cream }}
            className="px-2.5 py-1 rounded text-xs hover:opacity-80">Reiniciar cooldown</button>
        </div>
      )}

      {/* PAUSED BANNER */}
      {isPaused && (
        <div style={{ background: C.wine + '30', borderLeft: `3px solid ${C.wineLight}` }} className="flex items-center justify-between px-4 py-2.5 rounded-lg">
          <span className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: C.brassLight }} />
            <span>Buffet en pausa — reanuda en {formatTimeFull(pauseRemaining)}</span>
          </span>
          <button onClick={() => handleAction('resume')} disabled={actionLoading}
            style={{ background: C.sage, color: C.base }}
            className="px-3 py-1 rounded-lg text-xs font-bold hover:opacity-80">Reanudar ahora</button>
        </div>
      )}

      {/* ACTIVE SESSIONS GRID */}
      {sessions.length === 0 && !loading && (
        <div className="text-center py-12">
          <span className="text-3xl">🍽️</span>
          <p className="mt-2 text-sm" style={{ color: C.muted }}>No hay sesiones de buffet activas</p>
          {freeTables.length > 0 && (
            <button onClick={() => setShowOpenModal(true)}
              style={{ background: C.brass, color: C.base }}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-bold hover:opacity-80">
              <Plus className="w-4 h-4 inline mr-1" />Abrir mesa
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sessions.map(s => {
          const elapsed = now - s.started_at;
          const limit = getCfg(s, 'time_limit');
          const cooldownLimit = getCfg(s, 'cooldown');
          const inCooldown = s.cooldown_until > now;
          const cooldownRemaining = inCooldown ? Math.max(0, s.cooldown_until - now) : 0;
          const coverEff = s.override_cover_price > 0 ? s.override_cover_price : s.cover_price_snapshot;
          const estimated = s.adult_count * Number(coverEff) + s.child_count * Number(s.child_price_snapshot) + s.senior_count * Number(s.senior_price_snapshot) + Number(s.waste_amount);
          const colors = getTimeColor(elapsed, limit);
          const selected = selectedIds.has(s.id);

          return (
            <div key={s.id}
              onClick={() => batchMode ? toggleSelect(s.id) : openSessionActions(s)}
              style={{
                background: C.surface,
                border: selected ? `2px solid ${C.brassLight}` : `1px solid ${C.line}`,
                cursor: 'pointer',
              }}
              className="rounded-xl p-4 transition-all hover:opacity-90 relative"
            >
              {/* Checkbox en batch mode */}
              {batchMode && (
                <div className="absolute top-2 right-2">
                  <div style={{ background: selected ? C.brassLight : 'transparent', border: `2px solid ${selected ? C.brassLight : C.muted}`, width: 20, height: 20 }} className="rounded flex items-center justify-center">
                    {selected && <Check className="w-3 h-3" style={{ color: C.base }} />}
                  </div>
                </div>
              )}

              {/* Header: table name + guest icons */}
              <div className="flex items-start justify-between mb-2">
                <p className="font-display text-lg" style={{ color: C.cream }}>{s.table_name}</p>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {s.adult_count + s.child_count + s.senior_count}
                  </span>
                  {s.child_count > 0 && <span style={{ color: C.sageLight }}>·{s.child_count}🛝</span>}
                  {s.senior_count > 0 && <span style={{ color: C.brassLight }}>·{s.senior_count}👴</span>}
                </div>
              </div>

              {/* Round + cooldown */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: C.brass + '30', color: C.brassLight }}>
                  Ronda {s.round}
                </span>
                {inCooldown && (
                  <span className="text-xs flex items-center gap-1" style={{ color: C.brassLight }}>
                    <Clock className="w-3 h-3" />{formatTime(cooldownRemaining)}
                  </span>
                )}
              </div>

              {/* Time elapsed */}
              <div className="flex items-center gap-2 text-xs">
                <span style={{ color }}>{formatTimeFull(elapsed)}</span>
                <span style={{ color: C.muted }}>/ {limit} min</span>
                <div style={{ background: C.surfaceLight }} className="flex-1 h-1.5 rounded-full overflow-hidden">
                  <div style={{
                    background: colors,
                    width: Math.min(100, (elapsed / (limit * 60000)) * 100) + '%',
                    height: '100%',
                    borderRadius: 999,
                    transition: 'width 1s linear',
                  }} />
                </div>
              </div>

              {/* Estimated */}
              <div className="mt-2 text-right">
                <span className="text-lg font-bold font-mono" style={{ color: C.cream }}>{euros(estimated)}</span>
              </div>
            </div>
          );
        })}

        {/* Empty free tables → open button */}
        {!batchMode && freeTables.length > 0 && sessions.length > 0 && freeTables.slice(0, 4).map(t => (
          <div key={t.id}
            onClick={() => setShowOpenModal(true)}
            style={{ background: C.surfaceLight, border: `1px dashed ${C.line}` }}
            className="rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:opacity-80 min-h-[140px]"
          >
            <Plus className="w-5 h-5" style={{ color: C.muted }} />
            <span className="text-xs" style={{ color: C.muted }}>Abrir buffet</span>
          </div>
        ))}
      </div>

      {/* Big "Abrir buffet" CTA when there are many free tables */}
      {freeTables.length > 0 && !batchMode && (
        <div className="text-center">
          <button onClick={() => setShowOpenModal(true)}
            style={{ background: C.brass, color: C.base }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-80">
            <Plus className="w-4 h-4 inline mr-1" />Abrir mesa buffet ({freeTables.length} libres)
          </button>
        </div>
      )}

      {/* ===== OPEN BUFFET MODAL ===== */}
      {showOpenModal && (
        <OpenBuffetModal
          freeTables={freeTables}
          config={config}
          onConfirm={async ({ tableId, tableName, adults, children, seniors }) => {
            await handleAction('open', { tableId, tableName, adults, children, seniors });
            setShowOpenModal(false);
          }}
          onClose={() => setShowOpenModal(false)}
          loading={actionLoading}
          C={C}
        />
      )}

      {/* ===== SESSION ACTIONS MODAL ===== */}
      {selectedSession && (
        <SessionActionsModal
          session={selectedSession}
          config={config}
          now={now}
          currentUser={currentUser}
          onAction={(action, payload) => handleAction(action, { sessionId: selectedSession.id, ...payload })}
          onClose={() => setSelectedSession(null)}
          loading={actionLoading}
          C={C}
        />
      )}

      {/* ===== OVERRIDE MODAL ===== */}
      {showOverrideModal && selectedSession && (
        <OverrideModal
          session={selectedSession}
          config={config}
          onConfirm={async (vals) => {
            await handleAction('override', { sessionId: selectedSession.id, ...vals });
            setShowOverrideModal(false);
          }}
          onClose={() => setShowOverrideModal(false)}
          loading={actionLoading}
          C={C}
        />
      )}

      {/* ===== CONFIG MODAL ===== */}
      {showConfigModal && (
        <ConfigModal
          config={config}
          onConfirm={async (vals) => {
            await handleAction('update_config', vals);
            setShowConfigModal(false);
          }}
          onClose={() => setShowConfigModal(false)}
          loading={actionLoading}
          C={C}
        />
      )}
    </div>
  );
}

/* ───────────────── OPEN BUFFET MODAL ───────────────── */
function OpenBuffetModal({ freeTables, config, onConfirm, onClose, loading, C }) {
  const [tableId, setTableId] = useState(freeTables[0]?.id || '');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [seniors, setSeniors] = useState(0);

  const tableName = freeTables.find(t => t.id === tableId)?.name || '';
  const cover = Number(config?.cover_price || 25);
  const childP = Number(config?.child_price || 12.50);
  const seniorP = Number(config?.senior_price || 18);
  const estimated = adults * cover + children * childP + seniors * seniorP;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center no-print">
      <div onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, maxWidth: 380, width: '90%' }} className="relative rounded-xl p-5 fade-up">
        <h3 className="font-display text-lg mb-4" style={{ color: C.brassLight }}>Abrir buffet</h3>

        <label className="text-xs mb-1 block" style={{ color: C.muted }}>Mesa</label>
        <select value={tableId} onChange={e => setTableId(e.target.value)}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="w-full rounded-lg px-3 py-2 text-sm mb-4">
          {freeTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <GuestCounter label="Adultos" value={adults} onChange={setAdults} min={1} C={C} />
        <GuestCounter label="Niños" value={children} onChange={setChildren} C={C} />
        <GuestCounter label="Mayores" value={seniors} onChange={setSeniors} C={C} />

        <div className="text-right mt-3 mb-4">
          <span className="text-xs" style={{ color: C.muted }}>Estimado: </span>
          <span className="font-bold font-mono text-lg" style={{ color: C.cream }}>{euros(estimated)}</span>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} style={{ color: C.muted, background: C.surfaceLight }}
            className="flex-1 rounded-lg py-2.5 text-sm hover:opacity-80">Cancelar</button>
          <button onClick={() => onConfirm({ tableId, tableName, adults, children, seniors })}
            disabled={loading || !tableId}
            style={{ background: C.brass, color: C.base, opacity: (!tableId || loading) ? 0.5 : 1 }}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold hover:opacity-80">
            {loading ? 'Abriendo...' : 'Abrir'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestCounter({ label, value, onChange, min = 0, C }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm" style={{ color: C.cream }}>{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          style={{ background: C.surfaceLight, color: C.muted }}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"><Minus className="w-3.5 h-3.5" /></button>
        <span className="w-6 text-center font-bold">{value}</span>
        <button onClick={() => onChange(value + 1)}
          style={{ background: C.surfaceLight, color: C.muted }}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"><Plus className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

/* ───────────────── SESSION ACTIONS MODAL ───────────────── */
function SessionActionsModal({ session, config, now, currentUser, onAction, onClose, loading, C }) {
  const [tab, setTab] = useState('close');

  const elapsed = now - session.started_at;
  const limit = session.override_time_limit > 0 ? session.override_time_limit : (config?.time_limit || 90);
  const coverEff = session.override_cover_price > 0 ? session.override_cover_price : session.cover_price_snapshot;
  const estimated = session.adult_count * Number(coverEff) + session.child_count * Number(session.child_price_snapshot) + session.senior_count * Number(session.senior_price_snapshot) + Number(session.waste_amount);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center no-print">
      <div onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, maxWidth: 420, width: '90%', maxHeight: '90vh' }} className="relative rounded-xl p-5 fade-up overflow-y-auto">
        {/* Session info */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-lg" style={{ color: C.brassLight }}>{session.table_name}</h3>
            <p className="text-xs" style={{ color: C.muted }}>
              {session.adult_count + session.child_count + session.senior_count} comensales
              {session.child_count > 0 && ` (${session.child_count} niños)`}
              {session.senior_count > 0 && ` (${session.senior_count} mayores)`}
              · Ronda {session.round} · {formatTimeFull(elapsed)} de {limit} min
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onAction('call_customer', { sessionId: session.id })}
              disabled={loading}
              style={{ color: C.sageLight, background: C.sage + '20' }}
              className="p-1.5 rounded-lg hover:opacity-80 text-xs" title="Llamar al cliente">
              <Bell className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold font-mono text-lg" style={{ color: C.cream }}>{euros(estimated)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 pb-2 overflow-x-auto" style={{ borderBottom: `1px solid ${C.line}` }}>
          {[
            { id: 'close', label: 'Cerrar', icon: Check },
            { id: 'void', label: 'Anular', icon: Ban },
            { id: 'adjust', label: 'Comensales', icon: Users },
            { id: 'override', label: 'Ajustes', icon: Settings },
            { id: 'rounds', label: 'Rondas', icon: Clock },
            { id: 'waste', label: 'Desperdicio', icon: AlertTriangle },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ background: tab === t.id ? C.surfaceLight : 'transparent', color: tab === t.id ? C.brassLight : C.muted }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 shrink-0"
              >
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {tab === 'close' && <CloseTab session={session} config={config} onAction={onAction} onClose={onClose} loading={loading} C={C} />}
        {tab === 'void' && <VoidTab onAction={onAction} onClose={onClose} loading={loading} C={C} />}
        {tab === 'adjust' && <AdjustTab session={session} onAction={onAction} loading={loading} C={C} />}
        {tab === 'override' && <OverrideTab session={session} config={config} onAction={onAction} loading={loading} C={C} />}
        {tab === 'rounds' && <RoundsTab rounds={sessionRounds} session={session} onAction={onAction} loading={loading} C={C} />}
        {tab === 'waste' && <WasteTab session={session} onAction={onAction} onClose={onClose} loading={loading} C={C} />}

        <button onClick={onClose}
          style={{ color: C.muted, background: C.surfaceLight }}
          className="w-full rounded-lg py-2.5 text-sm mt-3 hover:opacity-80">Cerrar</button>
      </div>
    </div>
  );
}

function CloseTab({ session, config, onAction, onClose, loading, C }) {
  const [adults, setAdults] = useState(session.adult_count);
  const [children, setChildren] = useState(session.child_count);
  const [seniors, setSeniors] = useState(session.senior_count);
  const coverEff = session.override_cover_price > 0 ? session.override_cover_price : session.cover_price_snapshot;
  const estimated = adults * Number(coverEff) + children * Number(session.child_price_snapshot) + seniors * Number(session.senior_price_snapshot) + Number(session.waste_amount);

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: C.muted }}>Confirma o ajusta los comensales antes de cerrar. La mesa pasará a "cuenta" para cobrar.</p>
      <GuestCounter label="Adultos" value={adults} onChange={setAdults} min={0} C={C} />
      <GuestCounter label="Niños" value={children} onChange={setChildren} C={C} />
      <GuestCounter label="Mayores" value={seniors} onChange={setSeniors} C={C} />
      <div className="text-right my-3">
        <span className="font-bold font-mono text-lg" style={{ color: C.cream }}>{euros(estimated)}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} style={{ color: C.muted, background: C.surfaceLight }}
          className="flex-1 rounded-lg py-2 text-sm hover:opacity-80">Cancelar</button>
        <button onClick={() => onAction('close', { adults, children, seniors })}
          disabled={loading}
          style={{ background: C.brass, color: C.base, opacity: loading ? 0.5 : 1 }}
          className="flex-1 rounded-lg py-2 text-sm font-bold hover:opacity-80">
          {loading ? 'Cerrando...' : `Cerrar · ${euros(estimated)}`}
        </button>
      </div>
    </div>
  );
}

function VoidTab({ onAction, onClose, loading, C }) {
  const [reason, setReason] = useState('');

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: C.wineLight }}>No se genera ticket y la mesa vuelve a "libre". Solo para Managers.</p>
      <textarea value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Motivo obligatorio"
        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
        className="w-full rounded-lg px-3 py-2 text-sm mb-3 resize-none" rows={2} />
      <div className="flex gap-2">
        <button onClick={onClose} style={{ color: C.muted, background: C.surfaceLight }}
          className="flex-1 rounded-lg py-2 text-sm hover:opacity-80">Cancelar</button>
        <button onClick={() => onAction('void', { reason: reason || 'Anulación manual' })}
          disabled={loading || !reason.trim()}
          style={{ background: C.wine, color: C.cream, opacity: (loading || !reason.trim()) ? 0.5 : 1 }}
          className="flex-1 rounded-lg py-2 text-sm font-bold hover:opacity-80">
          {loading ? 'Anulando...' : 'Anular sesión'}
        </button>
      </div>
    </div>
  );
}

function AdjustTab({ session, onAction, loading, C }) {
  const [adults, setAdults] = useState(session.adult_count);
  const [children, setChildren] = useState(session.child_count);
  const [seniors, setSeniors] = useState(session.senior_count);

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: C.muted }}>Ajusta el número de comensales para esta sesión.</p>
      <GuestCounter label="Adultos" value={adults} onChange={setAdults} min={0} C={C} />
      <GuestCounter label="Niños" value={children} onChange={setChildren} C={C} />
      <GuestCounter label="Mayores" value={seniors} onChange={setSeniors} C={C} />
      <button onClick={() => onAction('adjust_guests', { adults, children, seniors })}
        disabled={loading}
        style={{ background: C.sage, color: C.base, marginTop: 12, opacity: loading ? 0.5 : 1 }}
        className="w-full rounded-lg py-2.5 text-sm font-bold hover:opacity-80">
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );
}

function OverrideTab({ session, config, onAction, loading, C }) {
  const [timeLimit, setTimeLimit] = useState(session.override_time_limit || config?.time_limit || 90);
  const [cooldown, setCooldown] = useState(session.override_cooldown || config?.cooldown || 5);
  const [roundCap, setRoundCap] = useState(session.override_round_cap || config?.round_cap || 3);
  const [coverPrice, setCoverPrice] = useState(session.override_cover_price > 0 ? session.override_cover_price : Number(session.cover_price_snapshot));

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: C.muted }}>Estos valores solo afectan a esta mesa. Al cerrar, vuelven a los valores globales.</p>
      <Field label="Tiempo límite (min)" type="number" value={timeLimit} onChange={v => setTimeLimit(Number(v))} C={C} />
      <Field label="Cooldown (min)" type="number" value={cooldown} onChange={v => setCooldown(Number(v))} C={C} />
      <Field label="Tope por ronda" type="number" value={roundCap} onChange={v => setRoundCap(Number(v))} C={C} />
      <Field label="Precio cubierto (€)" type="number" step="0.5" value={coverPrice} onChange={v => setCoverPrice(Number(v))} C={C} />
      <button onClick={() => onAction('override', { timeLimit, cooldown, roundCap, coverPrice })}
        disabled={loading}
        style={{ background: C.brass, color: C.base, marginTop: 12, opacity: loading ? 0.5 : 1 }}
        className="w-full rounded-lg py-2.5 text-sm font-bold hover:opacity-80">
        {loading ? 'Guardando...' : 'Guardar overrides'}
      </button>
    </div>
  );
}

/* ───────────────── ROUNDS TAB ───────────────── */
function RoundsTab({ rounds, session, onAction, loading, C }) {
  return (
    <div>
      <p className="text-xs mb-3" style={{ color: C.muted }}>Rondas de esta sesión. Marca como entregada cuando la cocina la haya servido.</p>
      {rounds.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: C.muted }}>Sin rondas todavía</p>
      )}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {rounds.map(r => (
          <div key={r.id} style={{ background: C.surfaceLight }} className="rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold" style={{ color: C.cream }}>Ronda {r.round_number}</span>
              <span className="text-xs" style={{ color: r.status === 'delivered' ? C.sageLight : (r.status === 'pending' ? C.brassLight : C.muted) }}>
                {r.status === 'delivered' ? '✅ Entregada' : (r.status === 'pending' ? '⏳ Pendiente' : r.status)}
              </span>
            </div>
            <p className="text-xs" style={{ color: C.muted }}>{r.item_count} platos · {new Date(r.requested_at).toLocaleTimeString()}</p>
            {r.status === 'pending' && (
              <button onClick={() => onAction('deliver_round', { roundId: r.id })}
                disabled={loading}
                style={{ background: C.sage, color: C.base, marginTop: 8, opacity: loading ? 0.5 : 1 }}
                className="w-full rounded-lg py-1.5 text-xs font-bold hover:opacity-80">
                {loading ? '...' : 'Marcar entregada'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── WASTE TAB ───────────────── */
function WasteTab({ session, onAction, onClose, loading, C }) {
  const [productName, setProductName] = useState('');
  const [charge, setCharge] = useState(5);

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: C.muted }}>Añade un cargo por desperdicio a esta mesa (plato sin consumir, etc.)</p>
      <div className="space-y-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>Concepto</label>
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
            placeholder="Ej: Entrecot sin tocar"
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="w-full rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>Cargo (€)</label>
          <div className="flex gap-2">
            {[3, 5, 8, 10, 15, 20].map(v => (
              <button key={v} onClick={() => setCharge(v)}
                style={{ background: charge === v ? C.brass : C.surfaceLight, color: charge === v ? C.base : C.cream }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80">{v}€</button>
            ))}
          </div>
        </div>
        <button onClick={() => onAction('add_waste', { sessionId: session.id, tableId: session.table_id, productId: 'waste', productName: productName || 'Desperdicio', charge })}
          disabled={loading || !productName.trim()}
          style={{ background: C.wine, color: C.cream, opacity: (loading || !productName.trim()) ? 0.5 : 1 }}
          className="w-full rounded-lg py-2.5 text-sm font-bold hover:opacity-80">
          {loading ? '...' : `Añadir ${euros(charge)}`}
        </button>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, step, C }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs" style={{ color: C.muted }}>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        step={step}
        style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, width: 80, textAlign: 'center' }}
        className="rounded-lg px-2 py-1 text-sm font-mono" />
    </div>
  );
}

/* ───────────────── CONFIG MODAL ───────────────── */
function ConfigModal({ config, onConfirm, onClose, loading, C }) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [timeLimit, setTimeLimit] = useState(config?.time_limit ?? 90);
  const [cooldown, setCooldown] = useState(config?.cooldown ?? 5);
  const [roundCap, setRoundCap] = useState(config?.round_cap ?? 3);
  const [coverPrice, setCoverPrice] = useState(Number(config?.cover_price ?? 25));
  const [childPrice, setChildPrice] = useState(Number(config?.child_price ?? 12.50));
  const [seniorPrice, setSeniorPrice] = useState(Number(config?.senior_price ?? 18));
  const [childMaxAge, setChildMaxAge] = useState(config?.child_max_age ?? 12);
  const [seniorMinAge, setSeniorMinAge] = useState(config?.senior_min_age ?? 65);
  const [staffOpens, setStaffOpens] = useState(config?.staff_opens_table ?? true);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center no-print">
      <div onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, maxWidth: 400, width: '90%', maxHeight: '90vh' }} className="relative rounded-xl p-5 fade-up overflow-y-auto">
        <h3 className="font-display text-lg mb-4" style={{ color: C.brassLight }}>Configuración del buffet</h3>

        <Toggle label="Buffet habilitado" value={enabled} onChange={setEnabled} C={C} />
        <Field label="Tiempo límite (min)" type="number" value={timeLimit} onChange={v => setTimeLimit(Number(v))} C={C} />
        <Field label="Cooldown (min)" type="number" value={cooldown} onChange={v => setCooldown(Number(v))} C={C} />
        <Field label="Tope por ronda" type="number" value={roundCap} onChange={v => setRoundCap(Number(v))} C={C} />
        <hr style={{ borderColor: C.line }} className="my-2" />
        <Field label="Precio cubierto (€)" type="number" step="0.5" value={coverPrice} onChange={v => setCoverPrice(Number(v))} C={C} />
        <Field label="Precio niños (€)" type="number" step="0.5" value={childPrice} onChange={v => setChildPrice(Number(v))} C={C} />
        <Field label="Precio mayores (€)" type="number" step="0.5" value={seniorPrice} onChange={v => setSeniorPrice(Number(v))} C={C} />
        <Field label="Edad máxima niños" type="number" value={childMaxAge} onChange={v => setChildMaxAge(Number(v))} C={C} />
        <Field label="Edad mínima mayores" type="number" value={seniorMinAge} onChange={v => setSeniorMinAge(Number(v))} C={C} />
        <hr style={{ borderColor: C.line }} className="my-2" />
        <Toggle label="Camarero abre mesa" value={staffOpens} onChange={setStaffOpens} C={C} />

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} style={{ color: C.muted, background: C.surfaceLight }}
            className="flex-1 rounded-lg py-2.5 text-sm hover:opacity-80">Cancelar</button>
          <button onClick={() => onConfirm({
            enabled, timeLimit, cooldown, roundCap, coverPrice, childPrice, seniorPrice,
            childMaxAge, seniorMinAge, staffOpensTable: staffOpens,
          })}
            disabled={loading}
            style={{ background: C.brass, color: C.base, opacity: loading ? 0.5 : 1 }}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold hover:opacity-80">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, C }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm" style={{ color: C.cream }}>{label}</span>
      <button onClick={() => onChange(!value)}
        style={{ background: value ? C.sage : C.surfaceLight }}
        className="w-10 h-5 rounded-full relative transition-colors">
        <span style={{
          background: C.cream,
          transform: value ? 'translateX(20px)' : 'translateX(2px)',
          width: 16, height: 16, borderRadius: 999, display: 'block',
          transition: 'transform 0.2s',
        }} />
      </button>
    </div>
  );
}
