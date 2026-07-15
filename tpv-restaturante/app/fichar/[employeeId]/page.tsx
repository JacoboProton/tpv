'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Check, Loader2, User, Coffee, LogIn, LogOut, Calendar } from 'lucide-react';

const ACTIONS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  entrada: { label: 'Entrada', icon: LogIn, color: '#7a9a7c', bg: '#7a9a7c30' },
  salida:  { label: 'Salida',  icon: LogOut, color: '#b05e5e', bg: '#b05e5e30' },
  pausa:   { label: 'Pausa',   icon: Coffee, color: '#c4a04a', bg: '#c4a04a30' },
  vuelta:  { label: 'Volver',  icon: Clock,  color: '#6a9af8', bg: '#6a9af830' },
};

interface Employee {
  id: string;
  name: string;
  pin?: string;
  position?: string;
}

interface Summary {
  isActive: boolean;
  isOnPause: boolean;
  lastAction: string;
  entrada?: string;
  salida?: string;
  pausas?: Array<{ start: string; end?: string }>;
  effectiveMinutes: number;
  pauseMinutes: number;
}

interface TimeOffRequest {
  id: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: string;
}

export default function FicharPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pin, setPin] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [fichando, setFichando] = useState<boolean>(false);
  const [pinRequired, setPinRequired] = useState<boolean>(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [clockinEnabled, setClockinEnabled] = useState<boolean>(true);
  const [myRequests, setMyRequests] = useState<TimeOffRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState<boolean>(false);
  const [reqForm, setReqForm] = useState<{ reason: string; fromDate: string; toDate: string; notes: string }>({ reason: 'vacaciones', fromDate: '', toDate: '', notes: '' });
  const [reqMsg, setReqMsg] = useState<string>('');
  const [reqSubmitting, setReqSubmitting] = useState<boolean>(false);

  const loadState = useCallback(async () => {
    try {
      const settingsRes = await fetch('/api/settings');
      const s = await settingsRes.json() as { clockinPinRequired?: string; clockinEnabled?: string };
      setPinRequired(s.clockinPinRequired !== 'false');
      setClockinEnabled(s.clockinEnabled !== 'false');
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json() as Employee[];
      const emp = (emps || []).find(e => e.id === employeeId);
      setEmployee(emp || null);
      if (emp) {
        const stateRes = await fetch(`/api/clockin?employeeId=${employeeId}&date=${new Date().toISOString().slice(0, 10)}`);
        if (stateRes.ok) {
          const data = await stateRes.json() as { summary?: Summary };
          setSummary(data.summary || null);
        }
        const reqRes = await fetch(`/api/time-off-requests?employeeId=${employeeId}`);
        if (reqRes.ok) setMyRequests(await reqRes.json() as TimeOffRequest[]);
      }
    } catch {}
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { loadState(); }, [loadState]);

  async function handleFichar(action: string) {
    setFichando(true);
    setMessage('');
    try {
      const r = await fetch('/api/clockin', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          employeeName: employee?.name,
          pin: pinRequired ? pin : undefined,
          method: 'qr',
          action,
        }),
      });
      const data = await r.json() as { ok: boolean; action?: string; error?: string };
      if (data.ok) {
        const a = ACTIONS[data.action || ''];
        setMessage(`✅ ${a?.label || data.action} registrada — ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        setPin('');
        loadState();
      } else {
        setMessage('❌ ' + (data.error || 'Error'));
      }
    } catch {
      setMessage('❌ Error de conexión');
    }
    setFichando(false);
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!reqForm.fromDate || !reqForm.toDate) return;
    setReqSubmitting(true);
    setReqMsg('');
    try {
      const r = await fetch('/api/time-off-requests', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', employeeId, employeeName: employee?.name, ...reqForm }),
      });
      const d = await r.json() as { ok: boolean; error?: string };
      if (d.ok) {
        setReqMsg('✅ Solicitud enviada');
        setReqForm({ reason: 'vacaciones', fromDate: '', toDate: '', notes: '' });
        setShowRequestForm(false);
        const reqRes = await fetch(`/api/time-off-requests?employeeId=${employeeId}`);
        if (reqRes.ok) setMyRequests(await reqRes.json() as TimeOffRequest[]);
      } else setReqMsg('❌ ' + (d.error || 'Error'));
    } catch { setReqMsg('❌ Error de conexión'); }
    setReqSubmitting(false);
  }

  function nextAction(): string {
    if (!summary) return 'entrada';
    if (summary.isOnPause) return 'vuelta';
    if (summary.isActive) return 'salida';
    if (summary.lastAction === 'salida') return 'entrada';
    return 'entrada';
  }

  function formatTime(ts?: string): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function formatMinutes(mins?: number): string {
    if (mins === undefined || mins === null) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }

  function availableActions(): string[] {
    if (!summary) return ['entrada'];
    if (summary.isOnPause) return ['vuelta', 'salida'];
    if (summary.isActive) return ['pausa', 'salida'];
    return ['entrada'];
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a1a' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c4a04a' }} />
    </div>;
  }

  if (!clockinEnabled) {
    return <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#1a1a1a' }}>
      <p className="text-sm" style={{ color: '#8a8275' }}>Fichaje desactivado</p>
    </div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#1a1a1a' }}>
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#c4a04a20' }}>
          <Clock className="w-8 h-8" style={{ color: '#c4a04a' }} />
        </div>

        <h1 className="text-xl font-bold" style={{ color: '#e8e0d4' }}>Fichaje</h1>

        {!employee ? (
          <p className="text-sm" style={{ color: '#b05e5e' }}>Empleado no encontrado</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" style={{ color: '#8a8275' }} />
              <span className="text-lg font-medium" style={{ color: '#e8e0d4' }}>{employee.name}</span>
            </div>
            {employee.position && (
              <p className="text-xs" style={{ color: '#6b655a' }}>{employee.position}</p>
            )}

            {summary?.isActive && (
              <div className="rounded-xl p-3 space-y-1" style={{ background: '#222', border: '1px solid #333' }}>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: '#8a8275' }}>Entrada</span>
                  <span className="font-mono" style={{ color: '#7a9a7c' }}>{formatTime(summary.entrada)}</span>
                </div>
                {summary.pausas?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ color: '#8a8275' }}>Pausa {i + 1}</span>
                    <span className="font-mono" style={{ color: '#c4a04a' }}>
                      {formatTime(p.start)} → {p.end ? formatTime(p.end) : '…'}
                    </span>
                  </div>
                ))}
                {summary.salida && (
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: '#8a8275' }}>Salida</span>
                    <span className="font-mono" style={{ color: '#b05e5e' }}>{formatTime(summary.salida)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid #333' }} className="pt-1 mt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: '#8a8275' }}>Total</span>
                    <span className="font-mono" style={{ color: '#e8e0d4' }}>{formatMinutes(summary.effectiveMinutes)}</span>
                  </div>
                  {summary.pauseMinutes > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: '#8a8275' }}>Descanso</span>
                      <span className="font-mono" style={{ color: '#c4a04a' }}>{formatMinutes(summary.pauseMinutes)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pinRequired && (
              <div>
                <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                  value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="PIN"
                  className="w-32 text-center mx-auto text-2xl tracking-widest rounded-lg px-4 py-3"
                  style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333', fontSize: '1.5rem' }} />
              </div>
            )}

            <div className="space-y-2">
              {availableActions().map(action => {
                const a = ACTIONS[action];
                const IconComponent = a.icon;
                return (
                  <button key={action} onClick={() => handleFichar(action)}
                    disabled={fichando || (pinRequired && pin.length !== 4)}
                    className="w-full py-3 rounded-lg text-sm font-bold hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: a.color, color: '#000' }}>
                    {fichando ? <Loader2 className="w-4 h-4 animate-spin" /> : <IconComponent className="w-4 h-4" />}
                    {a.label}
                  </button>
                );
              })}
            </div>

            {message && (
              <p className="text-sm" style={{ color: message.startsWith('✅') ? '#7a9a7c' : '#b05e5e' }}>
                {message}
              </p>
            )}

            <div style={{ borderTop: '1px solid #333' }} className="pt-4 mt-4">
              <button onClick={() => setShowRequestForm(!showRequestForm)}
                className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:opacity-80"
                style={{ background: '#c4a04a20', color: '#c4a04a' }}>
                <Calendar className="w-3.5 h-3.5" />
                {showRequestForm ? 'Cerrar' : 'Solicitar ausencia'}
              </button>

              {showRequestForm && (
                <form onSubmit={handleSubmitRequest} className="mt-3 space-y-3" style={{ background: '#222', borderRadius: '12px', padding: '12px', border: '1px solid #333' }}>
                  <select value={reqForm.reason} onChange={e => setReqForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-xs"
                    style={{ background: '#1a1a1a', color: '#e8e0d4', border: '1px solid #333' }}>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="asunto personal">Asunto personal</option>
                    <option value="baja médica">Baja médica</option>
                    <option value="permiso">Permiso</option>
                    <option value="otro">Otro</option>
                  </select>
                  <div className="flex gap-2">
                    <input type="date" value={reqForm.fromDate} onChange={e => setReqForm(f => ({ ...f, fromDate: e.target.value }))}
                      className="flex-1 rounded-lg px-3 py-2 text-xs" required
                      style={{ background: '#1a1a1a', color: '#e8e0d4', border: '1px solid #333' }} />
                    <span className="flex items-center text-xs" style={{ color: '#8a8275' }}>→</span>
                    <input type="date" value={reqForm.toDate} onChange={e => setReqForm(f => ({ ...f, toDate: e.target.value }))}
                      className="flex-1 rounded-lg px-3 py-2 text-xs" required
                      style={{ background: '#1a1a1a', color: '#e8e0d4', border: '1px solid #333' }} />
                  </div>
                  <textarea value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Nota opcional…" rows={2}
                    className="w-full rounded-lg px-3 py-2 text-xs resize-none"
                    style={{ background: '#1a1a1a', color: '#e8e0d4', border: '1px solid #333' }} />
                  <button type="submit" disabled={reqSubmitting || !reqForm.fromDate || !reqForm.toDate}
                    className="w-full py-2 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: '#7a9a7c', color: '#000' }}>
                    {reqSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Enviar solicitud
                  </button>
                  {reqMsg && <p className="text-xs text-center" style={{ color: reqMsg.startsWith('✅') ? '#7a9a7c' : '#b05e5e' }}>{reqMsg}</p>}
                </form>
              )}
            </div>

            {myRequests.length > 0 && (
              <div style={{ borderTop: '1px solid #333' }} className="pt-4 mt-4 space-y-2">
                <p className="text-[10px] font-medium text-left" style={{ color: '#8a8275' }}>Mis solicitudes</p>
                {myRequests.slice(0, 5).map(r => (
                  <div key={r.id} className="rounded-lg px-3 py-2 text-[10px] flex items-center justify-between"
                    style={{ background: '#222', border: '1px solid #333' }}>
                    <div>
                      <span className="font-medium" style={{ color: '#e8e0d4' }}>{r.reason}</span>
                      <span className="ml-2" style={{ color: '#8a8275' }}>{r.fromDate} → {r.toDate}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                      style={{
                        background: r.status === 'approved' ? '#7a9a7c30' : r.status === 'rejected' ? '#b05e5e30' : '#c4a04a30',
                        color: r.status === 'approved' ? '#7a9a7c' : r.status === 'rejected' ? '#b05e5e' : '#c4a04a'
                      }}>
                      {r.status === 'approved' ? 'Aprobada' : r.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
