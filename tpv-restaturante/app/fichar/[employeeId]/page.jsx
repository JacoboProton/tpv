'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Check, Loader2, User, Coffee, LogIn, LogOut } from 'lucide-react';

const ACTIONS = {
  entrada: { label: 'Entrada', icon: LogIn, color: '#7a9a7c', bg: '#7a9a7c30' },
  salida:  { label: 'Salida',  icon: LogOut, color: '#b05e5e', bg: '#b05e5e30' },
  pausa:   { label: 'Pausa',   icon: Coffee, color: '#c4a04a', bg: '#c4a04a30' },
  vuelta:  { label: 'Volver',  icon: Clock,  color: '#6a9af8', bg: '#6a9af830' },
};

export default function FicharPage() {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [fichando, setFichando] = useState(false);
  const [pinRequired, setPinRequired] = useState(true);
  const [summary, setSummary] = useState(null);
  const [clockinEnabled, setClockinEnabled] = useState(true);

  const loadState = useCallback(async () => {
    try {
      const settingsRes = await fetch('/api/settings');
      const s = await settingsRes.json();
      setPinRequired(s.clockinPinRequired !== 'false');
      setClockinEnabled(s.clockinEnabled !== 'false');
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json();
      const emp = (emps || []).find(e => e.id === employeeId);
      setEmployee(emp || null);
      if (emp) {
        const stateRes = await fetch(`/api/clockin?employeeId=${employeeId}&date=${new Date().toISOString().slice(0, 10)}`);
        if (stateRes.ok) {
          const data = await stateRes.json();
          setSummary(data.summary || null);
        }
      }
    } catch {}
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { loadState(); }, [loadState]);

  async function handleFichar(action) {
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
      const data = await r.json();
      if (data.ok) {
        const a = ACTIONS[data.action];
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

  function nextAction() {
    if (!summary) return 'entrada';
    if (summary.isOnPause) return 'vuelta';
    if (summary.isActive) return 'salida';
    if (summary.lastAction === 'salida') return 'entrada';
    return 'entrada';
  }

  function formatTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function formatMinutes(mins) {
    if (!mins && mins !== 0) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }

  function availableActions() {
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

            {/* Today's summary */}
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

            {/* PIN */}
            {pinRequired && (
              <div>
                <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                  value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="PIN"
                  className="w-32 text-center mx-auto text-2xl tracking-widest rounded-lg px-4 py-3"
                  style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333', fontSize: '1.5rem' }} />
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {availableActions().map(action => {
                const a = ACTIONS[action];
                return (
                  <button key={action} onClick={() => handleFichar(action)}
                    disabled={fichando || (pinRequired && pin.length !== 4)}
                    className="w-full py-3 rounded-lg text-sm font-bold hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: a.color, color: '#000' }}>
                    {fichando ? <Loader2 className="w-4 h-4 animate-spin" /> : <a.icon className="w-4 h-4" />}
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
          </div>
        )}
      </div>
    </div>
  );
}
