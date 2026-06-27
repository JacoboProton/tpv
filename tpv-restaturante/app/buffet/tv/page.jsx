'use client';

import { useState, useEffect } from 'react';
import { Clock, Users } from 'lucide-react';

const C = {
  base: '#0d0f12', surface: '#1a1e24', surfaceLight: '#252b33',
  cream: '#e8dcc8', muted: '#6b7280',
  brass: '#b8860b', brassLight: '#d4a843',
  sage: '#6f9272', sageLight: '#8fbc8f',
  wine: '#722f37', wineLight: '#a0404f',
  line: '#2a2f38',
};

function formatTimeFull(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h > 0 ? h + 'h ' : ''}${m}' ${s}"`;
}

function formatTimeShort(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function BuffetTVPage() {
  const [sessions, setSessions] = useState([]);
  const [config, setConfig] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const r = await fetch('/api/buffet?scope=sessions');
      const data = await r.json();
      if (data) { setSessions(data.sessions || []); setConfig(data.config); }
    } catch {}
  };

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, []);
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);

  const getCfg = (s, key) => {
    if (key === 'time_limit') return s.override_time_limit > 0 ? s.override_time_limit : (config?.time_limit || 90);
    if (key === 'cooldown') return s.override_cooldown > 0 ? s.override_cooldown : (config?.cooldown || 5);
    return 0;
  };

  const getTimeColor = (elapsed, limit) => {
    const ratio = elapsed / (limit * 60000);
    if (ratio > 0.95) return C.wineLight;
    if (ratio > 0.75) return C.brassLight;
    return C.sage;
  };

  return (
    <div style={{ background: C.base, color: C.cream, minHeight: '100vh' }} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display" style={{ color: C.brassLight }}>🔄 Buffet · TV</h1>
        <span className="text-sm" style={{ color: C.muted }}>
          {new Date().toLocaleTimeString()} · {sessions.length} mesa{sessions.length !== 1 ? 's' : ''} activa{sessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sessions.map(s => {
          const elapsed = now - s.started_at;
          const limit = getCfg(s, 'time_limit');
          const inCooldown = s.cooldown_until > now;
          const cooldownRemaining = inCooldown ? Math.max(0, s.cooldown_until - now) : 0;
          const coverEff = s.override_cover_price > 0 ? s.override_cover_price : s.cover_price_snapshot;
          const estimated = s.adult_count * Number(coverEff) + s.child_count * Number(s.child_price_snapshot) + s.senior_count * Number(s.senior_price_snapshot) + Number(s.waste_amount);
          const timeColor = getTimeColor(elapsed, limit);
          const ratio = Math.min(100, (elapsed / (limit * 60000)) * 100);
          const circumference = 2 * Math.PI * 40;
          const offset = circumference - (ratio / 100) * circumference;

          return (
            <div key={s.id}
              style={{ background: C.surface, border: `1px solid ${C.line}` }}
              className="rounded-2xl p-5 flex flex-col items-center gap-3"
            >
              {/* Ring countdown */}
              <div className="relative w-24 h-24">
                <svg width="96" height="96" viewBox="0 0 96 96" className="absolute -top-1 -left-1">
                  <circle cx="48" cy="48" r="40" fill="none" stroke={C.surfaceLight} strokeWidth="5" />
                  <circle cx="48" cy="48" r="40" fill="none" stroke={timeColor} strokeWidth="5"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold font-mono" style={{ color: timeColor }}>{formatTimeShort(elapsed)}</p>
                    <p className="text-[10px]" style={{ color: C.muted }}>/ {limit} min</p>
                  </div>
                </div>
              </div>

              {/* Table name */}
              <p className="font-display text-xl text-center" style={{ color: C.cream }}>{s.table_name}</p>

              {/* Guests */}
              <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                <Users className="w-3.5 h-3.5" />
                {s.adult_count + s.child_count + s.senior_count} comensales
                {s.child_count > 0 && <span style={{ color: C.sageLight }}>·{s.child_count}🛝</span>}
                {s.senior_count > 0 && <span style={{ color: C.brassLight }}>·{s.senior_count}👴</span>}
              </div>

              {/* Round */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: C.brass + '30', color: C.brassLight }}>
                  Ronda {s.round}
                </span>
                {inCooldown && (
                  <span className="text-xs flex items-center gap-1" style={{ color: C.brassLight }}>
                    <Clock className="w-3 h-3" />{formatTimeShort(cooldownRemaining)}
                  </span>
                )}
              </div>

              {/* Estimated */}
              <div className="text-center">
                <span className="text-lg font-bold font-mono" style={{ color: C.cream }}>{(estimated).toFixed(2)}€</span>
              </div>
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-24">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-lg" style={{ color: C.muted }}>No hay sesiones activas</p>
        </div>
      )}
    </div>
  );
}
