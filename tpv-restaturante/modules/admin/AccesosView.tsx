'use client';

import { useState, useEffect, useMemo } from 'react';
import { LogIn, RefreshCw, Smartphone, Monitor, Search } from 'lucide-react';
import { useUi } from '@/modules/core/app-contexts';

interface AccessLogRow {
  id: number;
  employeeId: string;
  employeeName: string;
  role: string;
  deviceId?: string | null;
  loggedAt: number;
  exitAt?: number | null;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(entry: number, exit?: number | null): string {
  if (!exit) return 'En línea';
  const mins = Math.max(0, Math.round((exit - entry) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function termIcon(deviceId?: string | null) {
  return deviceId && deviceId.startsWith('mobile_')
    ? { label: 'Móvil', Icon: Smartphone }
    : { label: 'Web / TPV', Icon: Monitor };
}

export default function AccesosView() {
  const { colors: C } = useUi();
  const [logs, setLogs] = useState<AccessLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const { fetchAccessLogs } = await import('../../lib/api');
      const data = (await fetchAccessLogs(500, 0)) as { rows?: AccessLogRow[] };
      setLogs(data.rows || []);
    } catch { /* mantiene la lista anterior */ }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(l =>
      (l.employeeName || '').toLowerCase().includes(q) ||
      (l.role || '').toLowerCase().includes(q) ||
      (l.employeeId || '').toLowerCase().includes(q),
    );
  }, [logs, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: C.cream }}>Registro de accesos</h2>
          <p className="text-xs mt-1" style={{ color: C.muted }}>
            Quién entra y sale de la aplicación, con hora (web y móvil)
          </p>
        </div>
        <button onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
          style={{ background: C.surfaceLight, color: C.muted }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: C.muted }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por empleado o rol…"
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: '2rem' }}
          className="w-full rounded-lg px-3 py-1.5 text-xs" />
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: C.muted }}>
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
          <p className="text-xs">Cargando…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: C.muted }}>
          <LogIn className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay accesos registrados</p>
          <p className="text-xs mt-1">Los inicios y cierres de sesión aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: C.line }}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ background: C.surfaceLight }} className="uppercase tracking-wide">
                <th className="px-3 py-2 font-semibold" style={{ color: C.muted }}>Empleado</th>
                <th className="px-3 py-2 font-semibold" style={{ color: C.muted }}>Rol</th>
                <th className="px-3 py-2 font-semibold" style={{ color: C.muted }}>Terminal</th>
                <th className="px-3 py-2 font-semibold" style={{ color: C.muted }}>Entrada</th>
                <th className="px-3 py-2 font-semibold" style={{ color: C.muted }}>Salida</th>
                <th className="px-3 py-2 font-semibold" style={{ color: C.muted }}>Duración</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const { label, Icon } = termIcon(l.deviceId);
                return (
                  <tr key={l.id} className="border-t" style={{ borderColor: C.line }}>
                    <td className="px-3 py-2 font-medium" style={{ color: C.cream }}>{l.employeeName}</td>
                    <td className="px-3 py-2" style={{ color: C.muted }}>{l.role}</td>
                    <td className="px-3 py-2" style={{ color: C.muted }}>
                      <span className="inline-flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{label}</span>
                    </td>
                    <td className="px-3 py-2" style={{ color: C.muted }}>{formatTime(l.loggedAt)}</td>
                    <td className="px-3 py-2" style={{ color: C.muted }}>
                      {l.exitAt ? formatTime(l.exitAt) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          En línea
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2" style={{ color: C.muted }}>{formatDuration(l.loggedAt, l.exitAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}